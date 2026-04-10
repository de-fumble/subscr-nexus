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
    const { reference, payment_id } = await req.json();

    if (!reference) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing payment reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if this transaction was already recorded
    const { data: existingTransaction } = await supabase
      .from("one_time_payment_transactions")
      .select("id")
      .eq("paystack_reference", reference)
      .single();

    if (existingTransaction) {
      console.log("Transaction already recorded:", reference);
      return new Response(
        JSON.stringify({ success: true, message: "Payment already recorded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    // If payment_id is provided, try to fetch the organization's secret key
    if (payment_id) {
      const { data: payment } = await supabase
        .from("one_time_payments")
        .select("organizations(paystack_secret_key)")
        .eq("id", payment_id)
        .single();
        
      if (payment?.organizations?.paystack_secret_key) {
        paystackSecretKey = payment.organizations.paystack_secret_key;
      }
    }

    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ success: false, message: "Payment provider not configured" }),
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

    if (!verifyData.status || verifyData.data.status !== "success") {
      return new Response(
        JSON.stringify({ success: false, message: "Payment verification failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const txn = verifyData.data;
    const paymentId = txn.metadata?.payment_id;
    const customerName = txn.metadata?.customer_name || "";
    const customerEmail = txn.customer?.email || "";
    const amount = txn.amount / 100; // Convert from kobo to naira

    if (!paymentId) {
      return new Response(
        JSON.stringify({ success: false, message: "Payment ID not found in transaction" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the transaction in the new transactions table
    const { error: insertError } = await supabase
      .from("one_time_payment_transactions")
      .insert({
        payment_id: paymentId,
        amount: amount,
        payer_email: customerEmail,
        payer_name: customerName,
        paystack_reference: reference,
      });

    if (insertError) {
      console.error("Error recording transaction:", insertError);
      // If it's a duplicate key error, the transaction was already recorded
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ success: true, message: "Payment already recorded" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, message: "Failed to record payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Transaction recorded successfully:", reference);

    return new Response(
      JSON.stringify({ success: true, message: "Payment verified and recorded" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error instanceof Error ? error.message : "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
