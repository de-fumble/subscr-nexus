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

    // Get organization
    const { data: org } = await supabase
      .from("organizations")
      .select("id, paystack_secret_key")
      .eq("user_id", user.id)
      .single();

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

    // Fetch transactions from Paystack
    const transactionsResponse = await fetch(
      "https://api.paystack.co/transaction?perPage=100&status=success",
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const transactionsData = await transactionsResponse.json();

    // Fetch subscriptions from Paystack
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

    if (!transactionsData.status || !subscriptionsData.status) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch Paystack data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate analytics
    const transactions = transactionsData.data || [];
    const subscriptions = subscriptionsData.data || [];

    const totalRevenue = transactions.reduce(
      (sum: number, txn: any) => sum + (txn.amount / 100),
      0
    );

    const activeSubscriptions = subscriptions.filter(
      (sub: any) => sub.status === "active"
    ).length;

    const recurringRevenue = subscriptions
      .filter((sub: any) => sub.status === "active")
      .reduce((sum: number, sub: any) => sum + (sub.amount / 100), 0);

    // Calculate revenue by month for charts
    const revenueByMonth: { [key: string]: number } = {};
    transactions.forEach((txn: any) => {
      const date = new Date(txn.paid_at || txn.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + (txn.amount / 100);
    });

    const chartData = Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, revenue]) => ({
        month: new Date(month + "-01").toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
      }));

    return new Response(
      JSON.stringify({
        totalRevenue,
        recurringRevenue,
        activeSubscribers: activeSubscriptions,
        totalLifetimeRevenue: totalRevenue,
        chartData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching Paystack analytics:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
