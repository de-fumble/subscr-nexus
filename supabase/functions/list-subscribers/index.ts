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
    const { data: plans, error: plansError } = await supabase
      .from("subscription_plans")
      .select("name, paystack_plan_code")
      .eq("org_id", org.id)
      .eq("is_active", true);

    if (plansError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch plans" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const planCodes = new Set((plans || []).map((p: any) => p.paystack_plan_code).filter(Boolean));
    const planNameByCode = new Map((plans || []).map((p: any) => [p.paystack_plan_code, p.name]));

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
        created_at: sub.createdAt || sub.created_at || new Date().toISOString(),
      };
    });

    return new Response(
      JSON.stringify({ subscribers }),
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
