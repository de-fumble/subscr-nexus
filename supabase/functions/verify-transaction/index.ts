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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { reference } = await req.json();

    if (!reference) {
      return new Response(
        JSON.stringify({ error: "Missing transaction reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization - check if owner first, then staff
    let org = null;
    
    const { data: ownedOrg } = await supabase
      .from("organizations")
      .select("paystack_secret_key")
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
          .select("paystack_secret_key")
          .eq("id", membership.org_id)
          .single();
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

    // Verify transaction on Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.status) {
      return new Response(
        JSON.stringify({ transaction: null, message: "Transaction not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const txn = verifyData.data;
    
    // Determine the plan name - check various sources
    let planName = "N/A";
    if (txn.plan?.name) {
      planName = txn.plan.name;
    } else if (txn.metadata?.plan_name) {
      planName = txn.metadata.plan_name;
    } else if (txn.metadata?.custom_fields) {
      // Check custom fields for plan info
      const planField = txn.metadata.custom_fields.find((f: { variable_name: string }) => 
        f.variable_name === "plan_name" || f.variable_name === "plan"
      );
      if (planField?.value) {
        planName = planField.value;
      }
    }
    
    // Check if it's a one-time payment (no subscription/plan code)
    const isOneTimePayment = !txn.plan && !txn.plan_object && 
      (txn.metadata?.payment_type === "one_time" || 
       txn.metadata?.type === "one_time_payment" ||
       (!txn.authorization?.reusable && !txn.plan));
    
    if (isOneTimePayment && planName === "N/A") {
      planName = "One Time Payment";
    }

    const transaction = {
      reference: txn.reference,
      amount: txn.amount,
      status: txn.status,
      customer_email: txn.customer?.email || "N/A",
      customer_name: txn.metadata?.customer_name || txn.customer?.first_name || txn.customer?.customer_code || "N/A",
      paid_at: txn.paid_at || txn.transaction_date,
      plan: planName,
      currency: txn.currency,
    };

    return new Response(
      JSON.stringify({ transaction }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error verifying transaction:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
