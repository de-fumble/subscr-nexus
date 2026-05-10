import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, X-Client-Info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify requesting user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, orgId, subscriberId } = await req.json();

    if (!orgId && !subscriberId) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION: status — build recovery queue from Paystack failed txns + local DB
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "status") {
      if (!orgId) throw new Error("Missing orgId for status sync");

      const { data: org } = await supabase
        .from("organizations")
        .select("paystack_secret_key")
        .eq("id", orgId)
        .single();
      const paystackSecretKey = org?.paystack_secret_key || Deno.env.get("PAYSTACK_SECRET_KEY");

      if (!paystackSecretKey) throw new Error("Paystack secret key not found");

      // Step 1: Fetch failed & abandoned transactions directly from Paystack
      // This is the same source as the Transaction History tab, so historical
      // failures are visible even if the local DB was never updated by a webhook.
      const failedStatuses = ["failed", "abandoned"];
      const paystackFailed: any[] = [];

      for (const status of failedStatuses) {
        try {
          let page = 1;
          while (true) {
            const res = await fetch(
              `https://api.paystack.co/transaction?status=${status}&perPage=100&page=${page}`,
              { headers: { Authorization: `Bearer ${paystackSecretKey}` } }
            );
            const json = await res.json();
            const txns: any[] = json?.data || [];
            if (txns.length === 0) break;
            paystackFailed.push(...txns);
            if (txns.length < 100) break;
            page++;
          }
        } catch (e) {
          console.error(`Error fetching ${status} transactions from Paystack:`, e);
        }
      }

      console.log(`Paystack returned ${paystackFailed.length} failed/abandoned transactions`);

      // Step 2: Fetch all subscribers for this org from local DB
      const { data: allSubs, error: subError } = await supabase
        .from("subscribers")
        .select(`
          id, email, customer_name, amount, retry_count, last_retry_at,
          payment_failed_at, status, paystack_authorization_code, paystack_subscription_code,
          subscription_plans!inner(name, id, org_id)
        `)
        .eq("subscription_plans.org_id", orgId);

      if (subError) {
        console.error("Error fetching subscribers:", subError);
        throw subError;
      }

      console.log(`Local DB returned ${(allSubs || []).length} subscribers for org ${orgId}`);

      // Build a map of lowercase email -> subscriber for quick lookup
      const subByEmail = new Map<string, any>();
      for (const sub of (allSubs || [])) {
        subByEmail.set(sub.email.toLowerCase().trim(), sub);
      }

      // Step 3: Match Paystack failures against local subscribers
      // Sort newest first so the queue shows most recent failures first.
      paystackFailed.sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      const finalizedQueue: any[] = [];

      for (const txn of paystackFailed) {
        const email = (txn.customer?.email || "").toLowerCase().trim();
        if (!email) continue;

        const sub = subByEmail.get(email);
        if (!sub) continue; // Not a subscriber for this org

        const hasAuth = !!sub.paystack_authorization_code;
        const retryCount = sub.retry_count || 0;
        const isExhausted = retryCount >= 3 || sub.status === "payment_failed";

        const customerName = sub.customer_name ||
          ((txn.customer?.first_name || txn.customer?.last_name)
            ? `${txn.customer?.first_name || ""} ${txn.customer?.last_name || ""}`.trim()
            : null);

        finalizedQueue.push({
          id: `${sub.id}:${txn.reference || txn.id || txn.created_at || crypto.randomUUID()}`,
          subscriber_id: sub.id,
          email: sub.email,
          customer_name: customerName,
          amount: txn.amount / 100, // Use actual failed amount from Paystack (in kobo → naira)
          retry_count: retryCount,
          last_retry_at: sub.last_retry_at,
          payment_failed_at: txn.created_at || sub.payment_failed_at,
          status: txn.status,
          plan_name: txn.plan?.name || sub.subscription_plans?.name || "Standard Payment",
          failure_reason: txn.gateway_response || txn.message || "Payment failed",
          reference: txn.reference,
          has_authorization: hasAuth,
          is_exhausted: isExhausted,
        });
      }

      console.log(`Recovery queue built: ${finalizedQueue.length} entries`);

      return new Response(
        JSON.stringify({ retryQueue: finalizedQueue }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTION: retry_one — manually charge a subscriber's saved auth code
    // ─────────────────────────────────────────────────────────────────────────
    if (action === "retry_one") {
      if (!subscriberId) throw new Error("Missing subscriberId");

      const { data: subscriber } = await supabase
        .from("subscribers")
        .select(`*, subscription_plans(org_id), organizations(paystack_secret_key)`)
        .eq("id", subscriberId)
        .single();
        
      if (!subscriber || !subscriber.paystack_authorization_code) {
        return new Response(
          JSON.stringify({ success: false, message: "No valid authorization code found for this subscriber." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const paystackSecretKey = subscriber.organizations?.paystack_secret_key || Deno.env.get("PAYSTACK_SECRET_KEY");
      
      const chargeReq = await fetch("https://api.paystack.co/transaction/charge_authorization", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(subscriber.amount * 100), // Convert to kobo
          email: subscriber.email,
          authorization_code: subscriber.paystack_authorization_code,
        }),
      });

      const chargeRes = await chargeReq.json();
      
      if (chargeRes.status && chargeRes.data?.status === "success") {
        const reference = chargeRes.data.reference;
        const amount = chargeRes.data.amount; // kobo
        
        // 1. Reset subscriber to active
        await supabase.from("subscribers").update({
          retry_count: 0,
          last_retry_at: null,
          payment_failed_at: null,
          status: "active"
        }).eq("id", subscriber.id);

        // 2. Record successful transaction
        const { error: txError } = await supabase.from("transactions").insert({
          subscriber_id: subscriber.id,
          paystack_reference: reference,
          amount: amount,
          status: "success",
          paid_at: new Date().toISOString()
        });
        
        if (txError) console.error("Reconciliation Error (Transaction):", txError);

        // 3. Update billing profile total_paid
        const { data: bp } = await supabase
          .from("billing_profiles")
          .select("id")
          .eq("email", subscriber.email)
          .maybeSingle();

        if (bp?.id) {
          const { data: bpo } = await supabase
            .from("billing_profile_organizations")
            .select("total_paid, billing_profile_id")
            .eq("org_id", subscriber.subscription_plans?.org_id)
            .eq("billing_profile_id", bp.id)
            .maybeSingle();

          if (bpo) {
            const newTotal = (bpo.total_paid || 0) + amount;
            await supabase.from("billing_profile_organizations")
              .update({ total_paid: newTotal })
              .eq("billing_profile_id", bpo.billing_profile_id)
              .eq("org_id", subscriber.subscription_plans?.org_id);
          }
        }
        
        return new Response(
          JSON.stringify({ success: true, message: "Payment successful and reconciled!" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const newRetryCount = (subscriber.retry_count || 0) + 1;
        const isExhausted = newRetryCount >= 3;
        
        await supabase.from("subscribers").update({
          retry_count: newRetryCount,
          last_retry_at: new Date().toISOString(),
          status: isExhausted ? "payment_failed" : subscriber.status
        }).eq("id", subscriber.id);
        
        // Record failed retry in transactions
        if (chargeRes.data?.reference) {
          await supabase.from("transactions").insert({
            subscriber_id: subscriber.id,
            paystack_reference: chargeRes.data.reference,
            amount: Math.round(subscriber.amount * 100),
            status: "failed",
            paid_at: null
          });
        }
        
        return new Response(
          JSON.stringify({ success: false, message: chargeRes.data?.gateway_response || chargeRes.message || "Retry failed." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Process error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
