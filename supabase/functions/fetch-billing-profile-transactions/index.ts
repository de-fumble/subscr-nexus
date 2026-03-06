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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization
    let org = null;
    const { data: ownedOrg } = await supabaseAuth
      .from("organizations")
      .select("id, paystack_secret_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownedOrg) {
      org = ownedOrg;
    } else {
      const { data: membership } = await supabaseAuth
        .from("organization_members")
        .select("org_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membership) {
        const { data: staffOrg } = await supabaseAuth
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
        JSON.stringify({ error: "Payment provider not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get org's subscription plan codes and names
    const { data: plans } = await serviceClient
      .from("subscription_plans")
      .select("id, name, paystack_plan_code, price")
      .eq("org_id", org.id);

    const planCodeToName = new Map<string, string>();
    for (const p of plans || []) {
      planCodeToName.set(p.paystack_plan_code, p.name);
    }
    const orgPlanCodes = new Set((plans || []).map((p: any) => p.paystack_plan_code));

    // Get org's standard (one-time) payment IDs
    const { data: oneTimePayments } = await serviceClient
      .from("one_time_payments")
      .select("id, name")
      .eq("org_id", org.id);

    const otpIdToName = new Map<string, string>();
    for (const otp of oneTimePayments || []) {
      otpIdToName.set(otp.id, otp.name);
    }

    // Fetch ALL transactions from Paystack for this customer email
    let allTransactions: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `https://api.paystack.co/transaction?customer=${encodeURIComponent(email)}&perPage=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();

      if (!data.status || !data.data?.length) {
        hasMore = false;
        break;
      }

      allTransactions = [...allTransactions, ...data.data];

      if (data.data.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log(`Fetched ${allTransactions.length} total Paystack transactions for ${email}`);

    // Filter and categorize transactions belonging to this org
    const orgTransactions: any[] = [];

    for (const tx of allTransactions) {
      let planName = "";
      let matched = false;

      // 1. Check subscription plan match
      const planCode = tx.plan_object?.plan_code || tx.plan?.plan_code || tx.metadata?.plan_code;
      if (planCode && orgPlanCodes.has(planCode)) {
        planName = planCodeToName.get(planCode) || "Unknown Plan";
        matched = true;
      }

      // 2. Check standard payment match via metadata
      if (!matched) {
        const paymentId = tx.metadata?.payment_id;
        if (paymentId && otpIdToName.has(paymentId)) {
          planName = otpIdToName.get(paymentId) || "Standard Payment";
          matched = true;
        }
      }

      // 3. Check metadata for org_id match
      if (!matched && tx.metadata?.org_id === org.id) {
        planName = tx.metadata?.plan_name || tx.metadata?.payment_name || "Payment";
        matched = true;
      }

      if (matched) {
        orgTransactions.push({
          id: tx.id?.toString() || tx.reference,
          amount: tx.amount / 100, // kobo to naira
          status: tx.status,
          paystack_reference: tx.reference,
          created_at: tx.created_at || tx.createdAt,
          paid_at: tx.paid_at || tx.paidAt || tx.created_at,
          plan_name: planName,
        });
      }
    }

    // Also check local one_time_payment_transactions for this email in this org
    const { data: localOtpTx } = await serviceClient
      .from("one_time_payment_transactions")
      .select("id, amount, paid_at, created_at, payer_email, payer_name, paystack_reference, payment_id")
      .eq("payer_email", email);

    // Add any local OTP transactions that weren't caught by Paystack API
    const existingRefs = new Set(orgTransactions.map((t: any) => t.paystack_reference));
    for (const ltx of localOtpTx || []) {
      if (existingRefs.has(ltx.paystack_reference)) continue;
      if (otpIdToName.has(ltx.payment_id)) {
        orgTransactions.push({
          id: ltx.id,
          amount: Number(ltx.amount), // already in naira in DB
          status: "success",
          paystack_reference: ltx.paystack_reference,
          created_at: ltx.created_at,
          paid_at: ltx.paid_at,
          plan_name: otpIdToName.get(ltx.payment_id) || "Standard Payment",
        });
      }
    }

    console.log(`Filtered to ${orgTransactions.length} org transactions for ${email}`);

    // Sort by date descending
    orgTransactions.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Calculate totals
    const successfulTx = orgTransactions.filter((t: any) => t.status === "success");
    const totalSpend = successfulTx.reduce((sum: number, t: any) => sum + t.amount, 0);

    const spendByPlan: Record<string, number> = {};
    successfulTx.forEach((t: any) => {
      spendByPlan[t.plan_name] = (spendByPlan[t.plan_name] || 0) + t.amount;
    });

    return new Response(
      JSON.stringify({
        transactions: orgTransactions,
        totalSpend,
        spendByPlan,
        totalTransactions: orgTransactions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching billing profile transactions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
