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
    const supabase = createClient(supabaseUrl, supabaseKey); // We use service role to safely update the DB

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

    if (action === "status") {
      if (!orgId) throw new Error("Missing orgId for status sync");

      const { data: org } = await supabase.from("organizations").select("paystack_secret_key").eq("id", orgId).single();
      const paystackSecretKey = org?.paystack_secret_key || Deno.env.get("PAYSTACK_SECRET_KEY");

      if (!paystackSecretKey) throw new Error("Paystack secret key not found");

      // Step 1: Broad candidates from local DB
      const { data: candidates, error: subError } = await supabase
        .from("subscribers")
        .select(`
          id, email, customer_name, amount, retry_count, last_retry_at, 
          payment_failed_at, status, paystack_authorization_code, paystack_subscription_code,
          subscription_plans!inner(name, id, org_id)
        `)
        .eq("subscription_plans.org_id", orgId)
        .or("payment_failed_at.not.is.null,retry_count.gt.0,status.eq.payment_failed");

      if (subError) throw subError;

      const now = new Date();
      const finalizedQueue: any[] = [];

      // Step 2: Parallel check each candidate against Paystack for true current health
      const verifyPromises = (candidates || []).map(async (sub: any) => {
        let isActuallyFailing = true;
        
        // If we have a subscription code, ask Paystack for the absolute truth
        if (sub.paystack_subscription_code) {
          try {
            const paystackRes = await fetch(`https://api.paystack.co/subscription/${sub.paystack_subscription_code}`, {
              headers: { Authorization: `Bearer ${paystackSecretKey}` }
            });
            const paystackData = await paystackRes.json();
            
            if (paystackData.status && paystackData.data) {
              const psStatus = paystackData.data.status?.toLowerCase();
              
              // Paystack says "active"? Then they are NOT failing right now.
              if (psStatus === "active") {
                isActuallyFailing = false;
                
                // SELF-HEALING: Clear local DB flags if we know they're healthy now
                await supabase.from("subscribers").update({
                  payment_failed_at: null,
                  retry_count: 0,
                  status: "active"
                }).eq("id", sub.id);
                
                console.log(`Self-healed subscriber ${sub.email}: Status is ${psStatus} on Paystack.`);
              }
            }
          } catch (e) {
            console.error(`Error verifying ${sub.email} with Paystack:`, e);
          }
        }

        if (isActuallyFailing) {
          let isEligibleNow = false;
          let isExhausted = sub.retry_count >= 3 || sub.status === "payment_failed";
          
          const lastRetry = sub.last_retry_at ? new Date(sub.last_retry_at) : (sub.payment_failed_at ? new Date(sub.payment_failed_at) : null);
          
          if (!isExhausted && lastRetry) {
            const cooldownPeriodDays = 6;
            const nextEligibleTime = new Date(lastRetry.getTime() + cooldownPeriodDays * 24 * 60 * 60 * 1000);
            isEligibleNow = now >= nextEligibleTime;
          } else if (!isExhausted && !lastRetry) {
            isEligibleNow = true;
          }

          finalizedQueue.push({
            id: sub.id,
            email: sub.email,
            customer_name: sub.customer_name,
            amount: sub.amount,
            retry_count: sub.retry_count || 0,
            last_retry_at: sub.last_retry_at,
            payment_failed_at: sub.payment_failed_at,
            status: sub.status,
            plan_name: sub.subscription_plans?.name || "Unknown Plan",
            plan_id: sub.subscription_plans?.id || null,
            next_retry_eligible: isEligibleNow ? "eligible_now" : "scheduled",
            has_authorization: !!sub.paystack_authorization_code,
            is_eligible_now: isEligibleNow,
            is_exhausted: isExhausted
          });
        }
      });

      await Promise.all(verifyPromises);

      // Final sorting (most recent failure first)
      finalizedQueue.sort((a, b) => {
        const da = new Date(a.payment_failed_at || 0).getTime();
        const db = new Date(b.payment_failed_at || 0).getTime();
        return db - da;
      });

      return new Response(JSON.stringify({ retryQueue: finalizedQueue }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "retry_one") {
      if (!subscriberId) throw new Error("Missing subscriberId");

      const { data: subscriber } = await supabase
        .from("subscribers")
        .select(`*, organizations(paystack_secret_key)`)
        .eq("id", subscriberId)
        .single();
        
      if (!subscriber || !subscriber.paystack_authorization_code) {
        return new Response(JSON.stringify({ success: false, message: "No valid authorization code found for this subscriber." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        await supabase.from("subscribers").update({
          retry_count: 0,
          last_retry_at: null,
          payment_failed_at: null,
          status: "active"
        }).eq("id", subscriber.id);
        
        return new Response(JSON.stringify({ success: true, message: "Payment successful!" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        const newRetryCount = (subscriber.retry_count || 0) + 1;
        const isExhausted = newRetryCount >= 3;
        
        await supabase.from("subscribers").update({
          retry_count: newRetryCount,
          last_retry_at: new Date().toISOString(),
          status: isExhausted ? "payment_failed" : subscriber.status
        }).eq("id", subscriber.id);
        
        return new Response(JSON.stringify({ success: false, message: chargeRes.data?.gateway_response || chargeRes.message || "Retry failed." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Process error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
