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
    let paystackSecretKey = null;
    
    const { data: ownedOrg } = await supabase
      .from("organizations")
      .select("paystack_secret_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownedOrg) {
      org = ownedOrg;
      paystackSecretKey = org.paystack_secret_key;
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
        paystackSecretKey = org?.paystack_secret_key;
      }
    }

    // For regular users (not org owners/staff), use the platform's Paystack key
    if (!paystackSecretKey) {
      paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    }
    
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
    
    // Log full transaction data for debugging
    console.log("Full Paystack transaction data:", JSON.stringify(txn, null, 2));
    
    // Determine the plan name - check various sources
    let planName = "N/A";
    
    // Check plan object first
    if (txn.plan?.name) {
      planName = txn.plan.name;
      console.log("Plan name from txn.plan.name:", planName);
    } else if (txn.plan_object?.name) {
      planName = txn.plan_object.name;
      console.log("Plan name from txn.plan_object.name:", planName);
    } else if (txn.metadata?.plan_name) {
      planName = txn.metadata.plan_name;
      console.log("Plan name from metadata.plan_name:", planName);
    } else if (txn.metadata?.planName) {
      planName = txn.metadata.planName;
      console.log("Plan name from metadata.planName:", planName);
    } else if (txn.metadata?.custom_fields) {
      // Check custom fields for plan info
      const planField = txn.metadata.custom_fields.find((f: { variable_name: string }) => 
        f.variable_name === "plan_name" || f.variable_name === "plan"
      );
      if (planField?.value) {
        planName = planField.value;
        console.log("Plan name from custom_fields:", planName);
      }
    }
    
    // If still no plan name and there's a plan_code, try to fetch from our database
    const planCode = txn.plan?.plan_code || txn.plan_object?.plan_code || txn.metadata?.plan_code;
    if (planName === "N/A" && planCode) {
      console.log("Fetching plan from database with code:", planCode);
      
      // Use service role to query subscription_plans table
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const { data: planData } = await serviceClient
        .from("subscription_plans")
        .select("name")
        .eq("paystack_plan_code", planCode)
        .maybeSingle();
      
      if (planData?.name) {
        planName = planData.name;
        console.log("Plan name from database:", planName);
      }
    }
    
    // Check if it's a one-time payment (no subscription/plan code)
    const isOneTimePayment = !txn.plan && !txn.plan_object && !planCode &&
      (txn.metadata?.payment_type === "one_time" || 
       txn.metadata?.type === "one_time_payment" ||
       txn.metadata?.payment_id || // one-time payments have payment_id in metadata
       (!txn.authorization?.reusable && !txn.plan));
    
    if (isOneTimePayment && planName === "N/A") {
      // Try to get the one-time payment name from our database
      if (txn.metadata?.payment_id) {
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        
        const { data: paymentData } = await serviceClient
          .from("one_time_payments")
          .select("name")
          .eq("id", txn.metadata.payment_id)
          .maybeSingle();
        
        if (paymentData?.name) {
          planName = paymentData.name;
          console.log("Plan name from one_time_payments:", planName);
        } else {
          planName = "One Time Payment";
        }
      } else {
        planName = "One Time Payment";
      }
    }
    
    console.log("Final plan name:", planName);

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
