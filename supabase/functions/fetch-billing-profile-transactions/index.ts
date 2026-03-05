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

    // Get org's plan codes for filtering
    const { data: plans } = await supabaseAuth
      .from("subscription_plans")
      .select("id, name, paystack_plan_code, price")
      .eq("org_id", org.id);

    const planCodeToName = new Map<string, string>();
    const planCodeToPrice = new Map<string, number>();
    for (const p of plans || []) {
      planCodeToName.set(p.paystack_plan_code, p.name);
      planCodeToPrice.set(p.paystack_plan_code, p.price);
    }
    const orgPlanCodes = new Set((plans || []).map((p: any) => p.paystack_plan_code));

    // Fetch transactions from Paystack for this customer email
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

    // Filter to only this org's plan transactions
    const orgTransactions = allTransactions.filter((tx: any) => {
      const planCode = tx.plan_object?.plan_code || tx.plan?.plan_code;
      if (planCode && orgPlanCodes.has(planCode)) return true;
      
      // Check metadata
      const metaPlanCode = tx.metadata?.plan_code;
      if (metaPlanCode && orgPlanCodes.has(metaPlanCode)) return true;

      return false;
    });

    console.log(`Filtered to ${orgTransactions.length} org transactions for ${email}`);

    // Format transactions
    const formattedTransactions = orgTransactions.map((tx: any) => {
      const planCode = tx.plan_object?.plan_code || tx.plan?.plan_code || tx.metadata?.plan_code || "";
      const planName = planCodeToName.get(planCode) || "Unknown Plan";

      return {
        id: tx.id?.toString() || tx.reference,
        amount: tx.amount / 100, // Convert from kobo to naira
        status: tx.status,
        paystack_reference: tx.reference,
        created_at: tx.created_at || tx.createdAt,
        paid_at: tx.paid_at || tx.paidAt || tx.created_at,
        plan_name: planName,
      };
    });

    // Sort by date descending
    formattedTransactions.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Calculate totals
    const successfulTx = formattedTransactions.filter((t: any) => t.status === "success");
    const totalSpend = successfulTx.reduce((sum: number, t: any) => sum + t.amount, 0);

    const spendByPlan: Record<string, number> = {};
    successfulTx.forEach((t: any) => {
      spendByPlan[t.plan_name] = (spendByPlan[t.plan_name] || 0) + t.amount;
    });

    return new Response(
      JSON.stringify({
        transactions: formattedTransactions,
        totalSpend,
        spendByPlan,
        totalTransactions: formattedTransactions.length,
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
