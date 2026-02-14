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

    // Parse request body
    let requestBody: { orgId?: string; action?: string } = {};
    try {
      requestBody = await req.json();
    } catch {
      // No body or invalid JSON is fine for default action
    }

    const { action, orgId: requestedOrgId } = requestBody;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization based on requested orgId or user's default org
    let org = null;
    
    if (requestedOrgId) {
      // Verify user has access to the requested org
      const { data: requestedOrg } = await supabase
        .from("organizations")
        .select("id, paystack_secret_key, user_id")
        .eq("id", requestedOrgId)
        .maybeSingle();
      
      if (requestedOrg) {
        // Check if user is the owner
        if (requestedOrg.user_id === user.id) {
          org = requestedOrg;
        } else {
          // Check if user is a staff member of this org
          const { data: membership } = await supabase
            .from("organization_members")
            .select("org_id")
            .eq("user_id", user.id)
            .eq("org_id", requestedOrgId)
            .maybeSingle();
          
          if (membership) {
            org = requestedOrg;
          }
        }
      }
    }
    
    // Fall back to user's default org if no valid requested org
    if (!org) {
      const { data: ownedOrg } = await supabase
        .from("organizations")
        .select("id, paystack_secret_key")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedOrg) {
        org = ownedOrg;
      } else {
        // Check if user is a staff member
        const { data: membership } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membership) {
          const { data: staffOrg } = await supabase
            .from("organizations")
            .select("id, paystack_secret_key")
            .eq("id", membership.org_id)
            .maybeSingle();
          
          org = staffOrg;
        }
      }
    }

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
    const orgPlanIds = new Set(orgPlans?.map(p => p.id) || []);
    const planCodeToName: { [key: string]: string } = {};
    orgPlans?.forEach(p => {
      planCodeToName[p.paystack_plan_code] = p.name;
    });

    // Get organization's one-time payments for filtering
    const { data: orgOneTimePayments } = await supabase
      .from("one_time_payments")
      .select("id, paystack_reference")
      .eq("org_id", org.id);
    
    const orgOtpIds = new Set(orgOneTimePayments?.map(p => p.id) || []);
    const orgOtpReferences = new Set(
      orgOneTimePayments?.filter(p => p.paystack_reference).map(p => p.paystack_reference) || []
    );

    // Get one-time payment transaction references
    const { data: orgOtpTransactions } = await supabase
      .from("one_time_payment_transactions")
      .select("paystack_reference, payment_id")
      .in("payment_id", Array.from(orgOtpIds));
    
    const orgOtpTxnReferences = new Set(
      orgOtpTransactions?.map(t => t.paystack_reference) || []
    );

    console.log("Fetching Paystack data for organization:", org.id);
    console.log("Organization plan codes:", Array.from(orgPlanCodes));
    console.log("Organization plan IDs:", Array.from(orgPlanIds));
    console.log("Organization OTP IDs:", Array.from(orgOtpIds));
    console.log("Action:", action || "default");

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

    // Filter transactions to only include those STRICTLY related to this organization
    // This is the key fix - be very strict about what belongs to this org
    const orgTransactions = allTransactions.filter((txn: any) => {
      // 1. Check if transaction has subscription code matching org's subscriptions
      if (txn.subscription_code && orgSubscriptionCodes.has(txn.subscription_code)) {
        return true;
      }
      
      // 2. Check if transaction reference matches org's one-time payment references
      if (txn.reference && orgOtpReferences.has(txn.reference)) {
        return true;
      }
      
      // 3. Check if transaction reference matches org's OTP transaction references
      if (txn.reference && orgOtpTxnReferences.has(txn.reference)) {
        return true;
      }
      
      // 4. Check if transaction has payment_id metadata matching org's OTP IDs
      if (txn.metadata?.payment_id && orgOtpIds.has(txn.metadata.payment_id)) {
        return true;
      }
      
      // 5. Check if transaction has plan_id metadata matching org plans (by local plan ID)
      if (txn.metadata?.plan_id && orgPlanIds.has(txn.metadata.plan_id)) {
        return true;
      }
      
      // 6. Check if transaction has custom_fields with plan_id matching org plans
      if (txn.metadata?.custom_fields) {
        const planField = txn.metadata.custom_fields.find(
          (field: any) => field.variable_name === "plan_id"
        );
        if (planField?.value && orgPlanIds.has(planField.value)) {
          return true;
        }
      }
      
      // 7. Check if transaction plan directly matches org's plan codes
      const txnPlanCode = txn.plan?.plan_code || txn.plan_object?.plan_code;
      if (txnPlanCode && orgPlanCodes.has(txnPlanCode)) {
        return true;
      }

      return false;
    });
    
    console.log("Filtered organization transactions:", orgTransactions.length);

    // Handle retry_queue action - return subscribers queued for automatic retries with live data
    if (action === "retry_queue") {
      // Get local subscribers with failed payments for this org's plans
      const planIds = orgPlans?.map(p => p.id) || [];
      const planIdToName: { [key: string]: string } = {};
      orgPlans?.forEach(p => { planIdToName[p.id] = p.name; });

      let retrySubscribers: any[] = [];
      if (planIds.length > 0) {
        const { data: subs, error: subsError } = await supabase
          .from("subscribers")
          .select("id, email, customer_name, amount, retry_count, last_retry_at, payment_failed_at, status, plan_id, paystack_customer_code, paystack_authorization_code")
          .in("plan_id", planIds)
          .not("payment_failed_at", "is", null);

        if (subsError) {
          console.error("Error fetching retry subscribers:", subsError);
        }
        retrySubscribers = subs || [];
      }

      // Cross-reference with live Paystack subscription data for enrichment
      const enrichedRetryQueue = retrySubscribers.map((sub: any) => {
        // Find matching Paystack subscription for live status
        const paystackSub = orgSubscriptions.find(
          (ps: any) => ps.customer?.email === sub.email || 
            ps.customer?.customer_code === sub.paystack_customer_code
        );

        let nextRetryEligible: string | null = null;
        const isExhausted = sub.status === "payment_failed" || (sub.retry_count ?? 0) >= 3;
        
        if (!isExhausted && sub.status === "active") {
          if (sub.last_retry_at) {
            const next = new Date(sub.last_retry_at);
            next.setDate(next.getDate() + 6);
            nextRetryEligible = next.toISOString();
          } else {
            nextRetryEligible = "eligible_now";
          }
        }

        return {
          id: sub.id,
          email: sub.email,
          customer_name: sub.customer_name,
          amount: sub.amount,
          retry_count: sub.retry_count ?? 0,
          last_retry_at: sub.last_retry_at,
          payment_failed_at: sub.payment_failed_at,
          status: sub.status,
          plan_id: sub.plan_id,
          plan_name: planIdToName[sub.plan_id] || "Unknown Plan",
          has_authorization: !!sub.paystack_authorization_code,
          next_retry_eligible: nextRetryEligible,
          paystack_subscription_status: paystackSub?.status || null,
          paystack_next_payment_date: paystackSub?.next_payment_date || null,
        };
      });

      const activeRetries = enrichedRetryQueue.filter((s: any) => s.status === "active" && s.retry_count < 3);
      const exhausted = enrichedRetryQueue.filter((s: any) => s.status === "payment_failed" || s.retry_count >= 3);

      return new Response(
        JSON.stringify({
          retryQueue: enrichedRetryQueue,
          totalInQueue: enrichedRetryQueue.length,
          pendingRetries: activeRetries.length,
          exhaustedRetries: exhausted.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle failed_transactions action - return failed/abandoned transactions
    if (action === "failed_transactions") {
      const failedTransactions = orgTransactions.filter(
        (txn: any) => txn.status === "failed" || txn.status === "abandoned"
      );
      
      console.log("Failed transactions found:", failedTransactions.length);
      
      // Build subscription_code -> local plan name map for accurate lookups
      const subCodeToPlanName: { [key: string]: string } = {};
      orgSubscriptions.forEach((sub: any) => {
        if (sub.subscription_code && sub.plan?.plan_code) {
          const localName = planCodeToName[sub.plan.plan_code];
          if (localName) {
            subCodeToPlanName[sub.subscription_code] = localName;
          }
        }
      });

      // Build customer_code -> local plan name map (uses most recent subscription)
      const customerCodeToPlanName: { [key: string]: string } = {};
      orgSubscriptions.forEach((sub: any) => {
        if (sub.customer?.customer_code && sub.plan?.plan_code) {
          const localName = planCodeToName[sub.plan.plan_code];
          if (localName) {
            customerCodeToPlanName[sub.customer.customer_code] = localName;
          }
        }
      });

      // Enrich with plan names - ONLY use local database names, never raw Paystack names
      const enrichedFailedTransactions = failedTransactions.map((txn: any) => {
        let planName = null;
        
        // 1. Match plan_code from transaction to LOCAL org plans (most accurate)
        const txnPlanCode = txn.plan?.plan_code || txn.plan_object?.plan_code;
        if (txnPlanCode && planCodeToName[txnPlanCode]) {
          planName = planCodeToName[txnPlanCode];
        }
        
        // 2. Match subscription_code to local plan name via subscription lookup
        if (!planName && txn.subscription_code && subCodeToPlanName[txn.subscription_code]) {
          planName = subCodeToPlanName[txn.subscription_code];
        }
        
        // 3. Match metadata plan_id to local org plan
        if (!planName && txn.metadata?.plan_id) {
          const plan = orgPlans?.find(p => p.id === txn.metadata.plan_id);
          if (plan) planName = plan.name;
        }
        
        // 4. Match metadata plan_name ONLY if it matches a known local plan name
        if (!planName && txn.metadata?.plan_name) {
          const matchingPlan = orgPlans?.find(
            p => p.name.toLowerCase() === txn.metadata.plan_name.toLowerCase()
          );
          if (matchingPlan) {
            planName = matchingPlan.name;
          }
        }
        
        // 5. Try custom_fields for plan_id and match to org plans
        if (!planName && txn.metadata?.custom_fields) {
          const planField = txn.metadata.custom_fields.find(
            (f: any) => f.variable_name === "plan_id"
          );
          if (planField) {
            const plan = orgPlans?.find(p => p.id === planField.value);
            if (plan) planName = plan.name;
          }
        }
        
        // 6. Match customer_code to local plan name via subscription lookup
        if (!planName && txn.customer?.customer_code && customerCodeToPlanName[txn.customer.customer_code]) {
          planName = customerCodeToPlanName[txn.customer.customer_code];
        }
        
        // 7. Check if it's a standard payment
        const isStandardPayment = txn.metadata?.payment_type === "one_time" || 
          txn.metadata?.payment_id ||
          (orgOtpReferences.has(txn.reference) || orgOtpTxnReferences.has(txn.reference));
        
        if (!planName && isStandardPayment) {
          planName = "Standard Payment";
        }
        
        // Log for debugging
        console.log(`Failed txn ${txn.reference}: resolved planName=${planName}, plan_code=${txnPlanCode}, sub_code=${txn.subscription_code}, customer_code=${txn.customer?.customer_code}`);
        
        return {
          ...txn,
          plan: { name: planName || "Unknown Plan" },
        };
      });
      
      return new Response(
        JSON.stringify({ 
          failedTransactions: enrichedFailedTransactions,
          totalFailed: failedTransactions.filter((t: any) => t.status === "failed").length,
          totalAbandoned: failedTransactions.filter((t: any) => t.status === "abandoned").length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle export_transactions action - return all successful transactions for export
    if (action === "export_transactions") {
      console.log("Processing export_transactions action for org:", org.id);
      
      // Get successful Paystack transactions
      const successfulPaystackTransactions = orgTransactions.filter(
        (txn: any) => txn.status === "success"
      );
      
      console.log("Successful Paystack transactions for export:", successfulPaystackTransactions.length);
      
      // Also fetch transactions from local Supabase database for completeness
      const planIds = orgPlans?.map(p => p.id) || [];
      let localSubscriptionTransactions: any[] = [];
      let localOtpTransactions: any[] = [];
      
      // Fetch local subscription transactions
      if (planIds.length > 0) {
        const { data: subscribers } = await supabase
          .from("subscribers")
          .select("id, email, customer_name, plan_id")
          .in("plan_id", planIds);
        
        const subscriberIds = subscribers?.map(s => s.id) || [];
        const subscriberMap = new Map(subscribers?.map(s => [s.id, s]) || []);
        
        if (subscriberIds.length > 0) {
          const { data: txns } = await supabase
            .from("transactions")
            .select("*")
            .in("subscriber_id", subscriberIds)
            .eq("status", "success");
          
          localSubscriptionTransactions = (txns || []).map(txn => {
            const subscriber = subscriberMap.get(txn.subscriber_id);
            const plan = orgPlans?.find(p => p.id === subscriber?.plan_id);
            return {
              paid_at: txn.paid_at || txn.created_at,
              created_at: txn.created_at,
              customer_name: subscriber?.customer_name || "Unknown",
              email: subscriber?.email || "Unknown",
              type: "Subscription",
              plan_name: plan?.name || "Unknown Plan",
              amount: Number(txn.amount),
              reference: txn.paystack_reference || "N/A",
              status: txn.status,
              source: "local",
            };
          });
        }
      }
      
      console.log("Local subscription transactions:", localSubscriptionTransactions.length);
      
      // Fetch local one-time payment transactions
      const { data: otpPayments } = await supabase
        .from("one_time_payments")
        .select("id, name")
        .eq("org_id", org.id);
      
      const otpPaymentIds = otpPayments?.map(p => p.id) || [];
      const otpPaymentMap = new Map(otpPayments?.map(p => [p.id, p.name]) || []);
      
      if (otpPaymentIds.length > 0) {
        const { data: otpTxns } = await supabase
          .from("one_time_payment_transactions")
          .select("*")
          .in("payment_id", otpPaymentIds);
        
        localOtpTransactions = (otpTxns || []).map(txn => ({
          paid_at: txn.paid_at || txn.created_at,
          created_at: txn.created_at,
          customer_name: txn.payer_name || "Unknown",
          email: txn.payer_email || "Unknown",
          type: "One-Time Payment",
          plan_name: otpPaymentMap.get(txn.payment_id) || "One-Time Payment",
          amount: Number(txn.amount),
          reference: txn.paystack_reference || "N/A",
          status: "success",
          source: "local",
        }));
      }
      
      console.log("Local OTP transactions:", localOtpTransactions.length);
      
      // Enrich Paystack transactions with plan names and format for export
      const enrichedPaystackTransactions = successfulPaystackTransactions.map((txn: any) => {
        let planName = null;
        let customerName = txn.customer?.first_name 
          ? `${txn.customer.first_name} ${txn.customer.last_name || ""}`.trim()
          : null;
        let email = txn.customer?.email || null;
        
        // Try to match plan_code from transaction
        const txnPlanCode = txn.plan?.plan_code || txn.plan_object?.plan_code;
        if (txnPlanCode && planCodeToName[txnPlanCode]) {
          planName = planCodeToName[txnPlanCode];
        }
        
        // Try to find plan from subscription
        if (!planName && txn.customer) {
          const customerSub = orgSubscriptions.find(
            (sub: any) => sub.customer?.customer_code === txn.customer.customer_code
          );
          if (customerSub?.plan) {
            planName = customerSub.plan.name;
          }
        }
        
        // Try metadata for plan name
        if (!planName && txn.metadata?.plan_name) {
          planName = txn.metadata.plan_name;
        }
        
        // Try custom_fields for plan
        if (!planName && txn.metadata?.custom_fields) {
          const planField = txn.metadata.custom_fields.find(
            (f: any) => f.variable_name === "plan_id"
          );
          if (planField) {
            const plan = orgPlans?.find(p => p.id === planField.value);
            if (plan) planName = plan.name;
          }
        }
        
        // Try metadata for customer name
        if (!customerName && txn.metadata?.customer_name) {
          customerName = txn.metadata.customer_name;
        }
        
        // Determine transaction type
        const isOneTimePayment = txn.metadata?.payment_type === "one_time" || 
          txn.metadata?.payment_id ||
          (orgOtpReferences.has(txn.reference) || orgOtpTxnReferences.has(txn.reference));
        
        return {
          paid_at: txn.paid_at || txn.created_at,
          created_at: txn.created_at,
          customer_name: customerName || "Unknown",
          email: email || "Unknown",
          type: isOneTimePayment ? "One-Time Payment" : "Subscription",
          plan_name: planName || (isOneTimePayment ? "One-Time Payment" : "Unknown Plan"),
          amount: txn.amount / 100, // Convert from kobo to naira
          reference: txn.reference,
          status: txn.status,
          source: "paystack",
        };
      });
      
      // Combine all transactions - prioritize Paystack data, dedupe by reference
      const seenReferences = new Set<string>();
      const allTransactions: any[] = [];
      
      // Add Paystack transactions first (most authoritative)
      for (const txn of enrichedPaystackTransactions) {
        if (txn.reference && !seenReferences.has(txn.reference)) {
          seenReferences.add(txn.reference);
          allTransactions.push(txn);
        }
      }
      
      // Add local transactions that aren't already included
      for (const txn of [...localSubscriptionTransactions, ...localOtpTransactions]) {
        if (!txn.reference || txn.reference === "N/A" || !seenReferences.has(txn.reference)) {
          if (txn.reference && txn.reference !== "N/A") {
            seenReferences.add(txn.reference);
          }
          allTransactions.push(txn);
        }
      }
      
      console.log("Total combined transactions for export:", allTransactions.length);
      
      // Sort by date (most recent first)
      allTransactions.sort((a, b) => 
        new Date(b.paid_at || b.created_at).getTime() - new Date(a.paid_at || a.created_at).getTime()
      );
      
      return new Response(
        JSON.stringify({ 
          transactions: allTransactions,
          totalTransactions: allTransactions.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Active subscribers = non-canceled, non-expired, non-paused subscribers
    const excludedStatuses = ['cancelled', 'canceled', 'expired', 'paused', 'non-renewing', 'attention', 'completed'];
    const activeSubscriptions = orgSubscriptions.filter(
      (sub: any) => sub.status && !excludedStatuses.includes(sub.status.toLowerCase())
    ).length;

    // Calculate Active Subscribers by Plan
    const subscribersByPlan: { [planCode: string]: number } = {};
    orgSubscriptions.forEach((sub: any) => {
      if (sub.plan?.plan_code && sub.status && !excludedStatuses.includes(sub.status.toLowerCase())) {
        const planCode = sub.plan.plan_code;
        subscribersByPlan[planCode] = (subscribersByPlan[planCode] || 0) + 1;
      }
    });

    // Calculate Plan Distribution (%) = (Active subscribers for each plan ÷ total active subscribers) × 100
    const totalActiveForDistribution = Object.values(subscribersByPlan).reduce((sum, count) => sum + count, 0);
    const planDistribution = Object.entries(subscribersByPlan).map(([planCode, count]) => {
      const planName = planCodeToName[planCode] || planCode;
      const percentage = totalActiveForDistribution > 0 ? (count / totalActiveForDistribution) * 100 : 0;
      return {
        name: planName,
        count,
        percentage: Math.round(percentage * 10) / 10,
      };
    }).sort((a, b) => b.count - a.count);

    const recurringRevenue = orgSubscriptions
      .filter((sub: any) => sub.status === "active")
      .reduce((sum: number, sub: any) => sum + (sub.amount / 100), 0);

    // Calculate revenue by plan for histogram - prioritize plan_code matching for accuracy
    const revenueByPlan: { [key: string]: number } = {};
    successfulTransactions.forEach((txn: any) => {
      let planName = "Other";
      
      // 1. FIRST: Match plan_code from transaction directly (most accurate)
      const txnPlanCode = txn.plan?.plan_code || txn.plan_object?.plan_code;
      if (txnPlanCode && planCodeToName[txnPlanCode]) {
        planName = planCodeToName[txnPlanCode];
      }
      
      // 2. Try subscription_code to find the subscription and its plan
      if (planName === "Other" && txn.subscription_code) {
        const matchingSub = orgSubscriptions.find(
          (sub: any) => sub.subscription_code === txn.subscription_code
        );
        if (matchingSub?.plan?.plan_code && planCodeToName[matchingSub.plan.plan_code]) {
          planName = planCodeToName[matchingSub.plan.plan_code];
        } else if (matchingSub?.plan?.name) {
          planName = matchingSub.plan.name;
        }
      }
      
      // 3. Try metadata custom_fields for plan_id
      if (planName === "Other" && txn.metadata?.custom_fields) {
        const planField = txn.metadata.custom_fields.find(
          (f: any) => f.variable_name === "plan_id"
        );
        if (planField) {
          const plan = orgPlans?.find(p => p.id === planField.value);
          if (plan) planName = plan.name;
        }
      }
      
      // 4. Try metadata plan_name
      if (planName === "Other" && txn.metadata?.plan_name) {
        planName = txn.metadata.plan_name;
      }
      
      // 5. Check if it's a one-time/standard payment
      const isOneTimePayment = txn.metadata?.payment_type === "one_time" || 
        txn.metadata?.payment_id ||
        (orgOtpReferences.has(txn.reference) || orgOtpTxnReferences.has(txn.reference));
      
      if (planName === "Other" && isOneTimePayment) {
        planName = "Standard Payments";
      }
      
      // 6. Last resort: match by customer_code to subscription
      if (planName === "Other" && txn.customer?.customer_code) {
        const customerSub = orgSubscriptions.find(
          (sub: any) => sub.customer?.customer_code === txn.customer.customer_code
        );
        if (customerSub?.plan?.plan_code && planCodeToName[customerSub.plan.plan_code]) {
          planName = planCodeToName[customerSub.plan.plan_code];
        } else if (customerSub?.plan?.name) {
          planName = customerSub.plan.name;
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
    // ARPU = Total revenue in selected period ÷ Average number of active subscribers during that same period
    // For accurate ARPU, we calculate it per-month then average, OR use current active subscribers
    // Method: Sum of (monthly revenue / monthly avg subscribers) / number of months with data
    
    let monthsWithData = 0;
    let sumMonthlyArpu = 0;
    
    monthKeys.forEach((monthKey) => {
      const monthRevenue = monthlyRevenue[monthKey] || 0;
      const data = monthlySubscriberData[monthKey];
      const monthlyAvgSubs = (data.start + data.end) / 2;
      
      if (monthRevenue > 0 && monthlyAvgSubs > 0) {
        sumMonthlyArpu += monthRevenue / monthlyAvgSubs;
        monthsWithData++;
      }
    });
    
    // Average ARPU across months with actual data
    const arpu = monthsWithData > 0 ? sumMonthlyArpu / monthsWithData : (activeSubscriptions > 0 ? totalRevenue / activeSubscriptions : 0);

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
        planDistribution,
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
