import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Full request body:", body);
    
    const { email, name, plan_code, plan_id, amount } = body;

    // Get organization's Paystack secret key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("org_id, amount")
      .eq("id", plan_id)
      .single();

    console.log("Plan query result:", { plan, planError });

    if (!plan) {
      return new Response(
        JSON.stringify({ error: "Plan not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("paystack_secret_key")
      .eq("id", plan.org_id)
      .single();

    console.log("Org query result:", { org, orgError });

    const paystackSecretKey = org?.paystack_secret_key || Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: "Paystack secret key not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine the amount to use
    let finalAmount = amount || plan.amount;
    
    // If still no amount, fetch from Paystack
    if (!finalAmount && plan_code) {
      console.log("Fetching amount from Paystack plan...");
      const planDetailsResponse = await fetch(
        `https://api.paystack.co/plan/${plan_code}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const planDetails = await planDetailsResponse.json();
      console.log("Paystack plan details:", planDetails);

      if (planDetails.status && planDetails.data) {
        finalAmount = planDetails.data.amount;
      }
    }

    console.log("Final amount to use:", finalAmount);

    if (!finalAmount) {
      return new Response(
        JSON.stringify({ error: "Amount is required. Could not determine amount from plan." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare Paystack payload
    const paystackPayload = {
      email,
      amount: finalAmount,
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
    };

    console.log("Sending to Paystack:", paystackPayload);

    // Initialize transaction on Paystack
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paystackPayload),
      }
    );

    const paystackData = await paystackResponse.json();
    console.log("Full Paystack response:", paystackData);

    if (!paystackData.status) {
      return new Response(
        JSON.stringify({ 
          error: paystackData.message || "Failed to initialize payment",
          details: paystackData 
        }),
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