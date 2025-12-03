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

    // Get customer codes from organization's subscriptions
    const orgCustomerCodes = new Set(
      orgSubscriptions.map((sub: any) => sub.customer?.customer_code).filter(Boolean)
    );

    // Filter transactions to only include those from organization's customers
    // and that are related to organization's plans
    const orgTransactions = allTransactions.filter((txn: any) => {
      // Check if transaction is from an org customer
      const isOrgCustomer = txn.customer && orgCustomerCodes.has(txn.customer.customer_code);
      
      // Check if transaction has plan metadata matching org plans
      const hasPlanMetadata = txn.metadata?.plan_id && 
        orgPlans?.some(p => p.id === txn.metadata.plan_id);
      
      // Check if transaction has custom_fields with plan_id
      const hasCustomFieldPlan = txn.metadata?.custom_fields?.some(
        (field: any) => field.variable_name === "plan_id" && 
          orgPlans?.some(p => p.id === field.value)
      );

      return isOrgCustomer || hasPlanMetadata || hasCustomFieldPlan;
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

    // Calculate monthly revenue trend (last 6 months)
    const now = new Date();
    const monthlyRevenue: { [key: string]: number } = {};
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      monthlyRevenue[monthKey] = 0;
    }

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
