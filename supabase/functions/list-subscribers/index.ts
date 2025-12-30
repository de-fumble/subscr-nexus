import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Parse request body for optional planId filter
    let planId: string | null = null;
    let includeFailedPayments = false;
    try {
      const body = await req.json();
      planId = body?.planId || null;
      includeFailedPayments = body?.includeFailedPayments || false;
    } catch {
      // No body or invalid JSON, that's fine
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

    // Get organization - first check if user is owner, then check membership
    let org = null;
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

    // Get organization's subscription plan codes and names
    let plansQuery = supabase
      .from("subscription_plans")
      .select("id, name, paystack_plan_code")
      .eq("org_id", org.id);
    
    // If planId is provided, filter to just that plan
    if (planId) {
      plansQuery = plansQuery.eq("id", planId);
    }

    const { data: plans, error: plansError } = await plansQuery;

    if (plansError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch plans" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const planCodes = new Set((plans || []).map((p: any) => p.paystack_plan_code).filter(Boolean));
    const planNameByCode = new Map((plans || []).map((p: any) => [p.paystack_plan_code, p.name]));
    const planIdByCode = new Map((plans || []).map((p: any) => [p.paystack_plan_code, p.id]));

    // Fetch subscriptions from Paystack (first page; can be extended to paginate if needed)
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
        JSON.stringify({ error: "Failed to fetch subscriptions from Paystack" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subscriptions = (subscriptionsData.data || []).filter((sub: any) =>
      sub?.plan && planCodes.has(sub.plan.plan_code)
    );

    // Map to UI-friendly payload
    const subscribers = subscriptions.map((sub: any) => {
      const customer = sub.customer || {};
      const plan = sub.plan || {};
      const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "N/A";

      return {
        // Use subscription_code as a stable id for UI purposes
        id: sub.subscription_code,
        email: customer.email || "",
        customer_name: fullName,
        amount: typeof sub.amount === "number" ? sub.amount : (plan.amount ?? 0),
        status: sub.status || "",
        paystack_subscription_code: sub.subscription_code,
        paystack_customer_code: customer.customer_code || "",
        plan_name: planNameByCode.get(plan.plan_code) || plan.name || "Unknown",
        plan_id: planIdByCode.get(plan.plan_code) || null,
        plan_code: plan.plan_code,
        next_payment_date: sub.next_payment_date || null,
        created_at: sub.createdAt || sub.created_at || new Date().toISOString(),
      };
    });

    // Fetch failed payments if requested
    let failedPayments: any[] = [];
    if (includeFailedPayments && planId) {
      // Get subscribers from DB with failed status for this plan
      const { data: dbFailedSubs } = await supabase
        .from("subscribers")
        .select("*")
        .eq("plan_id", planId)
        .eq("status", "failed");
      
      failedPayments = (dbFailedSubs || []).map((sub: any) => ({
        id: sub.id,
        email: sub.email,
        customer_name: sub.customer_name || "N/A",
        amount: sub.amount,
        status: sub.status,
        failure_reason: sub.failure_reason,
        payment_failed_at: sub.payment_failed_at,
        retry_count: sub.retry_count,
        last_retry_at: sub.last_retry_at,
        paystack_subscription_code: sub.paystack_subscription_code,
      }));
    }

    return new Response(
      JSON.stringify({ subscribers, failedPayments }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error listing subscribers:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
