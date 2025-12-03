import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, X-Client-Info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization
    const { data: org } = await supabase
      .from("organizations")
      .select("id, paystack_secret_key")
      .eq("user_id", user.id)
      .single();

    if (!org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paystackSecretKey = org.paystack_secret_key || Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: "Paystack not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization's subscription plan codes
    const { data: orgPlans } = await supabase
      .from("subscription_plans")
      .select("id, paystack_plan_code, name, price")
      .eq("org_id", org.id);

    const orgPlanCodes = new Set(orgPlans?.map(p => p.paystack_plan_code) || []);
    const planCodeToName: { [key: string]: string } = {};
    orgPlans?.forEach(p => {
      planCodeToName[p.paystack_plan_code] = p.name;
    });

    console.log("Fetching Paystack data for organization:", org.id);
    console.log("Organization plan codes:", Array.from(orgPlanCodes));

    // Fetch all transactions from Paystack with pagination
    let allTransactions: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) { // Limit to 10 pages (1000 transactions)
      const transactionsResponse = await fetch(
        `https://api.paystack.co/transaction?perPage=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const transactionsData = await transactionsResponse.json();
      if (!transactionsData.status) {
        console.error("Failed to fetch transactions:", transactionsData);
        break;
      }

      const transactions = transactionsData.data || [];
      allTransactions = [...allTransactions, ...transactions];
      
      hasMore = transactions.length === 100;
      page++;
    }

    console.log("Total transactions fetched:", allTransactions.length);

    // Fetch subscriptions from Paystack
    const subscriptionsResponse = await fetch(
      "https://api.paystack.co/subscription?perPage=100",
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const subscriptionsData = await subscriptionsResponse.json();

    if (!subscriptionsData.status) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch Paystack subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subscriptions = subscriptionsData.data || [];

    // Filter subscriptions to only include organization's plans
    const orgSubscriptions = subscriptions.filter(
      (sub: any) => sub.plan && orgPlanCodes.has(sub.plan.plan_code)
    );

    console.log("Organization subscriptions:", orgSubscriptions.length);

    // Get subscription codes from organization's subscriptions for precise filtering
    const orgSubscriptionCodes = new Set(
      orgSubscriptions.map((sub: any) => sub.subscription_code).filter(Boolean)
    );

    // Get customer codes from organization's subscriptions
    const orgCustomerCodes = new Set(
      orgSubscriptions.map((sub: any) => sub.customer?.customer_code).filter(Boolean)
    );

    // Filter transactions to only include those related to organization's plans
    // Be strict: transaction must be linked to org's subscription or have org plan metadata
    const orgTransactions = allTransactions.filter((txn: any) => {
      // Check if transaction has subscription code matching org's subscriptions
      const hasOrgSubscription = txn.subscription_code && orgSubscriptionCodes.has(txn.subscription_code);
      
      // Check if transaction has plan metadata matching org plans (by local plan ID)
      const hasPlanMetadata = txn.metadata?.plan_id && 
        orgPlans?.some(p => p.id === txn.metadata.plan_id);
      
      // Check if transaction has custom_fields with plan_id matching org plans
      const hasCustomFieldPlan = txn.metadata?.custom_fields?.some(
        (field: any) => field.variable_name === "plan_id" && 
          orgPlans?.some(p => p.id === field.value)
      );

      // Check if customer is ONLY subscribed to this org's plans (stricter check)
      const isOrgOnlyCustomer = txn.customer && orgCustomerCodes.has(txn.customer.customer_code);

      // Prioritize subscription-based matching, fall back to metadata/customer matching
      return hasOrgSubscription || hasPlanMetadata || hasCustomFieldPlan || isOrgOnlyCustomer;
    });

    console.log("Organization transactions:", orgTransactions.length);

    // Calculate revenue from successful payments only
    const successfulTransactions = orgTransactions.filter(
      (txn: any) => txn.status === "success"
    );

    // Fetch refunds to subtract from total
    const refundsResponse = await fetch(
      "https://api.paystack.co/refund?perPage=100",
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const refundsData = await refundsResponse.json();
    let totalRefunds = 0;

    if (refundsData.status && refundsData.data) {
      // Filter refunds related to organization's transactions
      const orgTransactionRefs = new Set(orgTransactions.map((t: any) => t.reference));
      const orgRefunds = refundsData.data.filter((refund: any) => 
        orgTransactionRefs.has(refund.transaction?.reference)
      );
      totalRefunds = orgRefunds.reduce(
        (sum: number, refund: any) => sum + (refund.amount / 100),
        0
      );
    }

    console.log("Total refunds:", totalRefunds);

    // Calculate total revenue (successful payments minus refunds)
    const grossRevenue = successfulTransactions.reduce(
      (sum: number, txn: any) => sum + (txn.amount / 100),
      0
    );

    const totalRevenue = grossRevenue - totalRefunds;

    console.log("Gross revenue:", grossRevenue, "Net revenue:", totalRevenue);

    const activeSubscriptions = orgSubscriptions.filter(
      (sub: any) => sub.status === "active"
    ).length;

    const recurringRevenue = orgSubscriptions
      .filter((sub: any) => sub.status === "active")
      .reduce((sum: number, sub: any) => sum + (sub.amount / 100), 0);

    // Calculate revenue by plan for histogram
    const revenueByPlan: { [key: string]: number } = {};
    successfulTransactions.forEach((txn: any) => {
      // Try to find plan name from subscription
      let planName = "Other";
      
      if (txn.customer) {
        const customerSub = orgSubscriptions.find(
          (sub: any) => sub.customer?.customer_code === txn.customer.customer_code
        );
        if (customerSub?.plan) {
          planName = customerSub.plan.name;
        }
      }
      
      // Try metadata custom_fields
      if (planName === "Other" && txn.metadata?.custom_fields) {
        const planField = txn.metadata.custom_fields.find(
          (f: any) => f.variable_name === "plan_id"
        );
        if (planField) {
          const plan = orgPlans?.find(p => p.id === planField.value);
          if (plan) planName = plan.name;
        }
      }

      revenueByPlan[planName] = (revenueByPlan[planName] || 0) + (txn.amount / 100);
    });

    // Subtract refunds from revenue by plan (distribute proportionally if can't attribute)
    // For simplicity, we'll just report the gross per plan
    const chartData = Object.entries(revenueByPlan)
      .filter(([plan]) => plan !== "Other" || revenueByPlan["Other"] > 0)
      .map(([plan, revenue]) => ({
        plan,
        revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Calculate failed payments data
    const abandonedCount = orgTransactions.filter((t: any) => t.status === 'abandoned').length;
    const failedCount = orgTransactions.filter((t: any) => t.status === 'failed').length;

    const failedPaymentsData = [
      { name: 'Abandoned Checkout', value: abandonedCount },
      { name: 'Failed Payments', value: failedCount },
    ];

    // Calculate monthly revenue trend (last 12 months - yearly)
    const now = new Date();
    const monthlyRevenue: { [key: string]: number } = {};
    const monthlySubscriberData: { [key: string]: { start: number; end: number; new: number; churned: number } } = {};
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      monthlyRevenue[monthKey] = 0;
      monthlySubscriberData[monthKey] = { start: 0, end: 0, new: 0, churned: 0 };
    }

    // Calculate monthly revenue from successful transactions
    successfulTransactions.forEach((txn: any) => {
      const txnDate = new Date(txn.paid_at || txn.created_at);
      const monthKey = txnDate.toLocaleString('default', { month: 'short' });
      if (monthlyRevenue.hasOwnProperty(monthKey)) {
        monthlyRevenue[monthKey] += txn.amount / 100;
      }
    });

    const revenueTrend = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
      month,
      revenue,
    }));

    // Calculate subscriber metrics per month
    const monthKeys = Object.keys(monthlySubscriberData);
    
    orgSubscriptions.forEach((sub: any) => {
      const createdAt = new Date(sub.createdAt || sub.created_at);
      const createdMonthKey = createdAt.toLocaleString('default', { month: 'short' });
      
      // Count new subscribers per month
      if (monthlySubscriberData.hasOwnProperty(createdMonthKey)) {
        monthlySubscriberData[createdMonthKey].new++;
      }
      
      // Count churned subscribers (cancelled, non-renew, or failed payment after grace)
      if (sub.status === 'cancelled' || sub.status === 'non-renewing' || sub.status === 'attention') {
        const cancelledAt = sub.cancelledAt || sub.cancelled_at || sub.updatedAt || sub.updated_at;
        if (cancelledAt) {
          const cancelledDate = new Date(cancelledAt);
          const cancelledMonthKey = cancelledDate.toLocaleString('default', { month: 'short' });
          if (monthlySubscriberData.hasOwnProperty(cancelledMonthKey)) {
            monthlySubscriberData[cancelledMonthKey].churned++;
          }
        }
      }
    });

    // Calculate start/end subscribers for each month (cumulative)
    let runningTotal = 0;
    monthKeys.forEach((monthKey, index) => {
      monthlySubscriberData[monthKey].start = runningTotal;
      runningTotal += monthlySubscriberData[monthKey].new - monthlySubscriberData[monthKey].churned;
      monthlySubscriberData[monthKey].end = Math.max(0, runningTotal);
    });

    // Calculate subscriber growth trend
    const subscriberTrend = monthKeys.map(month => {
      const data = monthlySubscriberData[month];
      const growth = data.new - data.churned;
      const growthRate = data.start > 0 ? ((data.end - data.start) / data.start * 100) : (data.new > 0 ? 100 : 0);
      return {
        month,
        subscribers: data.end,
        growth,
        growthRate: Math.round(growthRate * 10) / 10,
      };
    });

    // Calculate Churn Rate (industry standard)
    // Churn Rate = (Subscribers lost during period / Subscribers at start of period) × 100
    const currentMonthKey = now.toLocaleString('default', { month: 'short' });
    const currentMonthData = monthlySubscriberData[currentMonthKey];
    const churnRate = currentMonthData && currentMonthData.start > 0
      ? (currentMonthData.churned / currentMonthData.start * 100)
      : 0;

    // Calculate total churned and total at period start for overall metrics
    const totalChurned = Object.values(monthlySubscriberData).reduce((sum, d) => sum + d.churned, 0);
    const periodStartSubscribers = monthlySubscriberData[monthKeys[0]]?.start || activeSubscriptions;

    // Calculate ARPU (industry standard)
    // ARPU = Total revenue / Average number of active subscribers
    const monthlyActiveAvg = monthKeys.reduce((sum, key) => {
      const data = monthlySubscriberData[key];
      return sum + (data.start + data.end) / 2;
    }, 0) / monthKeys.length;
    
    const arpu = monthlyActiveAvg > 0 ? totalRevenue / monthlyActiveAvg : 0;

    // Calculate subscriber growth rate (current month vs previous)
    const prevMonthKey = monthKeys[monthKeys.length - 2];
    const prevMonthData = monthlySubscriberData[prevMonthKey];
    const subscriberGrowthRate = prevMonthData && prevMonthData.end > 0
      ? ((activeSubscriptions - prevMonthData.end) / prevMonthData.end * 100)
      : 0;

    return new Response(
      JSON.stringify({
        totalRevenue,
        grossRevenue,
        totalRefunds,
        recurringRevenue,
        activeSubscribers: activeSubscriptions,
        chartData,
        failedPaymentsData,
        revenueTrend,
        subscriberTrend,
        churnRate: Math.round(churnRate * 10) / 10,
        arpu: Math.round(arpu),
        subscriberGrowthRate: Math.round(subscriberGrowthRate * 10) / 10,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching Paystack analytics:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
