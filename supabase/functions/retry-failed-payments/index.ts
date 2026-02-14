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
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body for action
    let body: { action?: string; orgId?: string; subscriberId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body is fine for default retry action
    }

    const { action, orgId, subscriberId } = body;

    // ── STATUS ACTION: Return retry queue for an organization ──
    if (action === "status" && orgId) {
      console.log("Fetching retry queue status for org:", orgId);

      // Get org's plans
      const { data: plans } = await supabase
        .from("subscription_plans")
        .select("id, name")
        .eq("org_id", orgId);

      if (!plans || plans.length === 0) {
        return new Response(
          JSON.stringify({ retryQueue: [], totalInQueue: 0, pendingRetries: 0, exhaustedRetries: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const planMap: Record<string, string> = {};
      plans.forEach(p => { planMap[p.id] = p.name; });
      const planIds = plans.map(p => p.id);

      // Get ALL subscribers with failed payments (same fields the retry logic uses)
      const { data: allFailed, error: fetchError } = await supabase
        .from("subscribers")
        .select(`
          id, email, customer_name, amount, retry_count, last_retry_at,
          payment_failed_at, status, plan_id,
          paystack_customer_code, paystack_authorization_code
        `)
        .in("plan_id", planIds)
        .not("payment_failed_at", "is", null);

      if (fetchError) {
        console.error("Error fetching subscribers:", fetchError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch subscribers" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const sixDaysAgo = new Date();
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

      const retryQueue = (allFailed || []).map(s => {
        const retryCount = s.retry_count ?? 0;
        const isExhausted = s.status === "payment_failed" || retryCount >= 3;
        const hasAuth = !!s.paystack_authorization_code;

        // Determine if eligible for next retry (mirrors retry logic exactly)
        let nextRetryEligible: string | null = null;
        let isEligibleNow = false;

        if (!isExhausted && s.status === "active" && retryCount < 3) {
          if (!s.last_retry_at) {
            // Never retried — eligible immediately
            nextRetryEligible = "eligible_now";
            isEligibleNow = true;
          } else {
            const lastRetry = new Date(s.last_retry_at);
            if (lastRetry < sixDaysAgo) {
              nextRetryEligible = "eligible_now";
              isEligibleNow = true;
            } else {
              const nextDate = new Date(lastRetry);
              nextDate.setDate(nextDate.getDate() + 6);
              nextRetryEligible = nextDate.toISOString();
            }
          }
        }

        return {
          id: s.id,
          email: s.email,
          customer_name: s.customer_name,
          amount: s.amount,
          retry_count: retryCount,
          last_retry_at: s.last_retry_at,
          payment_failed_at: s.payment_failed_at,
          status: s.status,
          plan_id: s.plan_id,
          plan_name: planMap[s.plan_id] || "Unknown Plan",
          has_authorization: hasAuth,
          next_retry_eligible: nextRetryEligible,
          is_eligible_now: isEligibleNow,
          is_exhausted: isExhausted,
        };
      });

      const pendingRetries = retryQueue.filter(s => !s.is_exhausted);
      const exhausted = retryQueue.filter(s => s.is_exhausted);
      const eligibleNow = retryQueue.filter(s => s.is_eligible_now);

      return new Response(
        JSON.stringify({
          retryQueue,
          totalInQueue: retryQueue.length,
          pendingRetries: pendingRetries.length,
          exhaustedRetries: exhausted.length,
          eligibleNow: eligibleNow.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── RETRY-ONE ACTION: Manually trigger retry for a single subscriber ──
    if (action === "retry_one" && subscriberId) {
      console.log("Manual retry for subscriber:", subscriberId);

      const { data: subscriber, error: subError } = await supabase
        .from("subscribers")
        .select(`
          id, email, customer_name, amount, retry_count,
          paystack_authorization_code, plan_id
        `)
        .eq("id", subscriberId)
        .single();

      if (subError || !subscriber) {
        return new Response(
          JSON.stringify({ error: "Subscriber not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!subscriber.paystack_authorization_code) {
        return new Response(
          JSON.stringify({ error: "No authorization code — cannot charge" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get org's paystack key
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("org_id")
        .eq("id", subscriber.plan_id)
        .single();

      let orgPaystackKey = paystackSecretKey;
      if (plan) {
        const { data: org } = await supabase
          .from("organizations")
          .select("paystack_secret_key")
          .eq("id", plan.org_id)
          .single();
        if (org?.paystack_secret_key) {
          orgPaystackKey = org.paystack_secret_key;
        }
      }

      const chargeResponse = await fetch("https://api.paystack.co/transaction/charge_authorization", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${orgPaystackKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authorization_code: subscriber.paystack_authorization_code,
          email: subscriber.email,
          amount: subscriber.amount,
          metadata: {
            subscriber_id: subscriber.id,
            retry_attempt: (subscriber.retry_count ?? 0) + 1,
            plan_id: subscriber.plan_id,
            manual_retry: true,
          },
        }),
      });

      const chargeResult = await chargeResponse.json();
      console.log(`Manual charge for ${subscriber.email}:`, chargeResult.status, chargeResult.message);

      if (chargeResult.status && chargeResult.data?.status === "success") {
        await supabase
          .from("subscribers")
          .update({ payment_failed_at: null, retry_count: 0, last_retry_at: new Date().toISOString() })
          .eq("id", subscriber.id);

        await supabase.from("transactions").insert({
          subscriber_id: subscriber.id,
          paystack_reference: chargeResult.data.reference,
          amount: subscriber.amount,
          status: "success",
          paid_at: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({ success: true, message: "Payment successful", email: subscriber.email }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const newRetryCount = (subscriber.retry_count ?? 0) + 1;
        await supabase
          .from("subscribers")
          .update({
            retry_count: newRetryCount,
            last_retry_at: new Date().toISOString(),
            status: newRetryCount >= 3 ? "payment_failed" : "active",
          })
          .eq("id", subscriber.id);

        await supabase.from("transactions").insert({
          subscriber_id: subscriber.id,
          paystack_reference: chargeResult.data?.reference || `manual_retry_${Date.now()}`,
          amount: subscriber.amount,
          status: "failed",
          paid_at: null,
        });

        return new Response(
          JSON.stringify({
            success: false,
            message: chargeResult.message || "Payment failed",
            email: subscriber.email,
            retry_count: newRetryCount,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── DEFAULT ACTION: Automatic bulk retry (called by cron) ──
    console.log("Starting automatic retry process for failed payments...");

    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

    const { data: failedSubscribers, error: fetchError } = await supabase
      .from("subscribers")
      .select(`
        id, email, customer_name, amount, retry_count,
        paystack_customer_code, paystack_authorization_code, plan_id
      `)
      .not("payment_failed_at", "is", null)
      .lt("retry_count", 3)
      .eq("status", "active")
      .or(`last_retry_at.is.null,last_retry_at.lt.${sixDaysAgo.toISOString()}`);

    if (fetchError) {
      console.error("Error fetching failed subscribers:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscribers" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${failedSubscribers?.length || 0} subscribers to retry`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      details: [] as Array<{ email: string; status: string; message: string }>,
    };

    for (const subscriber of failedSubscribers || []) {
      results.processed++;
      const orgPaystackKey = paystackSecretKey;

      if (!subscriber.paystack_authorization_code) {
        console.log(`Subscriber ${subscriber.email} has no authorization code, skipping`);
        results.details.push({ email: subscriber.email, status: "skipped", message: "No authorization code available" });
        continue;
      }

      console.log(`Retrying payment for ${subscriber.email} (attempt ${subscriber.retry_count + 1}/3)`);

      try {
        const chargeResponse = await fetch("https://api.paystack.co/transaction/charge_authorization", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${orgPaystackKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            authorization_code: subscriber.paystack_authorization_code,
            email: subscriber.email,
            amount: subscriber.amount,
            metadata: {
              subscriber_id: subscriber.id,
              retry_attempt: subscriber.retry_count + 1,
              plan_id: subscriber.plan_id,
            },
          }),
        });

        const chargeResult = await chargeResponse.json();
        console.log(`Charge response for ${subscriber.email}:`, chargeResult.status, chargeResult.message);

        if (chargeResult.status && chargeResult.data?.status === "success") {
          await supabase
            .from("subscribers")
            .update({ payment_failed_at: null, retry_count: 0, last_retry_at: new Date().toISOString() })
            .eq("id", subscriber.id);

          await supabase.from("transactions").insert({
            subscriber_id: subscriber.id,
            paystack_reference: chargeResult.data.reference,
            amount: subscriber.amount,
            status: "success",
            paid_at: new Date().toISOString(),
          });

          results.successful++;
          results.details.push({ email: subscriber.email, status: "success", message: "Payment retry successful" });
        } else {
          const newRetryCount = subscriber.retry_count + 1;
          await supabase
            .from("subscribers")
            .update({
              retry_count: newRetryCount,
              last_retry_at: new Date().toISOString(),
              status: newRetryCount >= 3 ? "payment_failed" : "active",
            })
            .eq("id", subscriber.id);

          await supabase.from("transactions").insert({
            subscriber_id: subscriber.id,
            paystack_reference: chargeResult.data?.reference || `retry_${Date.now()}`,
            amount: subscriber.amount,
            status: "failed",
            paid_at: null,
          });

          results.failed++;
          results.details.push({ email: subscriber.email, status: "failed", message: chargeResult.message || "Payment retry failed" });
        }
      } catch (chargeError) {
        const errorMessage = chargeError instanceof Error ? chargeError.message : "Unknown error";
        console.error(`Error processing retry for ${subscriber.email}:`, errorMessage);

        await supabase
          .from("subscribers")
          .update({ retry_count: subscriber.retry_count + 1, last_retry_at: new Date().toISOString() })
          .eq("id", subscriber.id);

        results.failed++;
        results.details.push({ email: subscriber.email, status: "error", message: errorMessage });
      }
    }

    console.log("Retry process completed:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in retry-failed-payments:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
