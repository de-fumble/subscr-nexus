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
    const { reference } = await req.json();

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

    // Get PAYSTACK_SECRET_KEY from env or we'll need to find it from the payment
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

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
    const customerName = txn.metadata?.customer_name;
    const customerEmail = txn.customer?.email;

    if (!paymentId) {
      return new Response(
        JSON.stringify({ success: false, message: "Payment ID not found in transaction" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the one-time payment record
    const { error: updateError } = await supabase
      .from("one_time_payments")
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        paid_by_email: customerEmail,
        paid_by_name: customerName,
        paystack_reference: reference,
      })
      .eq("id", paymentId)
      .eq("is_paid", false);

    if (updateError) {
      console.error("Error updating payment:", updateError);
      // Payment might already be marked as paid
      return new Response(
        JSON.stringify({ success: true, message: "Payment already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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