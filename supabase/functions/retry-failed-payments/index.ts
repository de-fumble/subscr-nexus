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

    console.log("Starting retry process for failed payments...");

    // Find subscribers with failed payments that haven't exceeded retry limit
    // and haven't been retried in the last 6 days (to ensure weekly retries)
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

    const { data: failedSubscribers, error: fetchError } = await supabase
      .from("subscribers")
      .select(`
        id,
        email,
        customer_name,
        amount,
        retry_count,
        paystack_customer_code,
        paystack_authorization_code,
        plan_id
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
      
      // Use the default Paystack key for retries
      const orgPaystackKey = paystackSecretKey;
      
      if (!subscriber.paystack_authorization_code) {
        console.log(`Subscriber ${subscriber.email} has no authorization code, skipping`);
        results.details.push({
          email: subscriber.email,
          status: "skipped",
          message: "No authorization code available",
        });
        continue;
      }

      console.log(`Retrying payment for ${subscriber.email} (attempt ${subscriber.retry_count + 1}/3)`);

      try {
        // Charge the customer's authorization
        const chargeResponse = await fetch("https://api.paystack.co/transaction/charge_authorization", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${orgPaystackKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            authorization_code: subscriber.paystack_authorization_code,
            email: subscriber.email,
            amount: subscriber.amount, // Amount is already in kobo
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
          // Payment successful - clear failed state
          const { error: updateError } = await supabase
            .from("subscribers")
            .update({
              payment_failed_at: null,
              retry_count: 0,
              last_retry_at: new Date().toISOString(),
            })
            .eq("id", subscriber.id);

          if (updateError) {
            console.error(`Error updating subscriber ${subscriber.email}:`, updateError);
          }

          // Record successful transaction
          await supabase.from("transactions").insert({
            subscriber_id: subscriber.id,
            paystack_reference: chargeResult.data.reference,
            amount: subscriber.amount,
            status: "success",
            paid_at: new Date().toISOString(),
          });

          results.successful++;
          results.details.push({
            email: subscriber.email,
            status: "success",
            message: "Payment retry successful",
          });

          console.log(`Payment retry successful for ${subscriber.email}`);
        } else {
          // Payment failed - increment retry count
          const newRetryCount = subscriber.retry_count + 1;
          
          const { error: updateError } = await supabase
            .from("subscribers")
            .update({
              retry_count: newRetryCount,
              last_retry_at: new Date().toISOString(),
              status: newRetryCount >= 3 ? "payment_failed" : "active",
            })
            .eq("id", subscriber.id);

          if (updateError) {
            console.error(`Error updating subscriber ${subscriber.email}:`, updateError);
          }

          // Record failed transaction
          await supabase.from("transactions").insert({
            subscriber_id: subscriber.id,
            paystack_reference: chargeResult.data?.reference || `retry_${Date.now()}`,
            amount: subscriber.amount,
            status: "failed",
            paid_at: null,
          });

          results.failed++;
          results.details.push({
            email: subscriber.email,
            status: "failed",
            message: chargeResult.message || "Payment retry failed",
          });

          console.log(`Payment retry failed for ${subscriber.email}, attempt ${newRetryCount}/3`);
        }
      } catch (chargeError) {
        const errorMessage = chargeError instanceof Error ? chargeError.message : "Unknown error";
        console.error(`Error processing retry for ${subscriber.email}:`, errorMessage);
        
        // Update retry count even on error
        await supabase
          .from("subscribers")
          .update({
            retry_count: subscriber.retry_count + 1,
            last_retry_at: new Date().toISOString(),
          })
          .eq("id", subscriber.id);

        results.failed++;
        results.details.push({
          email: subscriber.email,
          status: "error",
          message: errorMessage,
        });
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
