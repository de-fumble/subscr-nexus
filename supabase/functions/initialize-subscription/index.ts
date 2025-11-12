import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, plan_code, plan_id } = await req.json();

    // Get organization's Paystack secret key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("org_id, price, currency")
      .eq("id", plan_id)
      .single();

    if (!plan) {
      return new Response(
        JSON.stringify({ error: "Plan not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("paystack_secret_key")
      .eq("id", plan.org_id)
      .single();

    const paystackSecretKey = org?.paystack_secret_key || Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: "Payment configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and compute amount in kobo from plan price (stored in Naira)
    const amountKobo = Math.round(Number(plan.price) * 100);
    if (!amountKobo || amountKobo <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid plan amount configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize transaction on Paystack
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          plan: plan_code,
          callback_url: `${req.headers.get("origin")}/subscription-callback`,
          metadata: {
            custom_fields: [
              {
                display_name: "Customer Name",
                variable_name: "customer_name",
                value: name,
              },
              {
                display_name: "Plan ID",
                variable_name: "plan_id",
                value: plan_id,
              },
            ],
          },
        }),
      }
    );

    const paystackData = await paystackResponse.json();
    
    console.log("Paystack response:", JSON.stringify(paystackData, null, 2));

    if (!paystackData.status) {
      console.error("Paystack error:", paystackData);
      return new Response(
        JSON.stringify({ error: paystackData.message || "Failed to initialize payment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in initialize-subscription:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});