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
        JSON.stringify({ error: "Missing transaction reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to query DB without RLS restrictions
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ── 1. Search one_time_payment_transactions (Standard Payments) ──────────
    const { data: otpTxn } = await supabase
      .from("one_time_payment_transactions")
      .select(`
        id,
        amount,
        payer_email,
        payer_name,
        paystack_reference,
        paid_at,
        one_time_payments!inner(
          id,
          name,
          organizations!inner(org_name)
        )
      `)
      .eq("paystack_reference", reference.trim())
      .maybeSingle();

    if (otpTxn) {
      const otp = otpTxn.one_time_payments as any;
      return new Response(
        JSON.stringify({
          transaction: {
            reference: otpTxn.paystack_reference,
            amount: otpTxn.amount * 100, // frontend divides by 100 to display
            status: "success",
            customer_email: otpTxn.payer_email,
            customer_name: otpTxn.payer_name,
            paid_at: otpTxn.paid_at,
            plan: otp?.name || "Standard Payment",
            currency: "NGN",
            organization_name: otp?.organizations?.org_name || "N/A",
            payment_type: "Standard Payment",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Search subscription transactions ────────────────────────────────
    const { data: subTxn } = await supabase
      .from("transactions")
      .select(`
        id,
        amount,
        status,
        paystack_reference,
        paid_at,
        subscribers!inner(
          email,
          customer_name,
          subscription_plans!inner(
            name,
            organizations!inner(org_name)
          )
        )
      `)
      .eq("paystack_reference", reference.trim())
      .maybeSingle();

    if (subTxn) {
      const sub = subTxn.subscribers as any;
      const plan = sub?.subscription_plans as any;
      return new Response(
        JSON.stringify({
          transaction: {
            reference: subTxn.paystack_reference,
            amount: Number(subTxn.amount) * 100, // frontend divides by 100
            status: subTxn.status || "success",
            customer_email: sub?.email || "N/A",
            customer_name: sub?.customer_name || "N/A",
            paid_at: subTxn.paid_at,
            plan: plan?.name || "Subscription",
            currency: "NGN",
            organization_name: plan?.organizations?.org_name || "N/A",
            payment_type: "Subscription",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Not found in DB ──────────────────────────────────────────────────
    return new Response(
      JSON.stringify({ transaction: null, message: "Transaction not found" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error verifying transaction:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
