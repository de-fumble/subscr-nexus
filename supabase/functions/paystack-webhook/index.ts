import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();
    
    console.log("Received webhook request");

    // Verify webhook signature
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hash = createHmac("sha512", paystackSecretKey)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = JSON.parse(body);
    console.log("Webhook event:", event.event);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle subscription creation
    if (event.event === "subscription.create") {
      const { customer, plan, subscription_code, email_token, authorization } = event.data;
      
      // Extract plan_id from metadata
      const planId = event.data.metadata?.custom_fields?.find(
        (field: any) => field.variable_name === "plan_id"
      )?.value;

      if (!planId) {
        console.error("Plan ID not found in webhook metadata");
        return new Response(
          JSON.stringify({ error: "Plan ID not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create subscriber record with authorization code for retries
      const { error: insertError } = await supabase
        .from("subscribers")
        .insert({
          plan_id: planId,
          email: customer.email,
          customer_name: customer.first_name && customer.last_name 
            ? `${customer.first_name} ${customer.last_name}` 
            : customer.email,
          paystack_customer_code: customer.customer_code,
          paystack_subscription_code: subscription_code,
          paystack_authorization_code: authorization?.authorization_code || null,
          amount: event.data.amount,
          status: "active",
          next_payment_date: event.data.next_payment_date,
        });

      if (insertError) {
        console.error("Error creating subscriber:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create subscriber" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Subscriber created successfully with authorization code");
    }

    // Handle successful charge - clear any failed payment state
    if (event.event === "charge.success" && event.data.customer) {
      const { reference, amount, customer, paid_at, authorization } = event.data;

      // Find subscriber by customer code
      const { data: subscriber } = await supabase
        .from("subscribers")
        .select("id")
        .eq("paystack_customer_code", customer.customer_code)
        .single();

      if (subscriber) {
        // Clear failed payment state and update authorization code
        const { error: updateError } = await supabase
          .from("subscribers")
          .update({
            payment_failed_at: null,
            retry_count: 0,
            paystack_authorization_code: authorization?.authorization_code || null,
          })
          .eq("id", subscriber.id);

        if (updateError) {
          console.error("Error clearing failed payment state:", updateError);
        }

        // Record transaction
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            subscriber_id: subscriber.id,
            paystack_reference: reference,
            amount: amount,
            status: "success",
            paid_at: paid_at,
          });

        if (transactionError) {
          console.error("Error recording transaction:", transactionError);
        } else {
          console.log("Transaction recorded successfully, failed payment state cleared");
        }
      }
    }

    // Handle failed charge - mark for retry
    if (event.event === "charge.failed" && event.data.customer) {
      const { reference, amount, customer } = event.data;
      console.log(`Charge failed for customer ${customer.customer_code}`);

      // Find subscriber by customer code
      const { data: subscriber } = await supabase
        .from("subscribers")
        .select("id, retry_count")
        .eq("paystack_customer_code", customer.customer_code)
        .single();

      if (subscriber) {
        // Mark payment as failed for retry mechanism
        const { error: updateError } = await supabase
          .from("subscribers")
          .update({
            payment_failed_at: new Date().toISOString(),
          })
          .eq("id", subscriber.id);

        if (updateError) {
          console.error("Error marking payment as failed:", updateError);
        } else {
          console.log(`Payment marked as failed for subscriber ${subscriber.id}, will be retried`);
        }

        // Record failed transaction
        await supabase.from("transactions").insert({
          subscriber_id: subscriber.id,
          paystack_reference: reference,
          amount: amount,
          status: "failed",
          paid_at: null,
        });
      }
    }

    // Handle subscription disable
    if (event.event === "subscription.disable") {
      const { subscription_code } = event.data;

      const { error: updateError } = await supabase
        .from("subscribers")
        .update({ status: "cancelled" })
        .eq("paystack_subscription_code", subscription_code);

      if (updateError) {
        console.error("Error updating subscriber status:", updateError);
      } else {
        console.log("Subscriber status updated to cancelled");
      }
    }

    // Handle subscription not renew (when all retries exhausted by Paystack)
    if (event.event === "subscription.not_renew") {
      const { subscription_code, customer } = event.data;
      console.log(`Subscription not renewed for ${subscription_code}`);

      const { error: updateError } = await supabase
        .from("subscribers")
        .update({ 
          status: "payment_failed",
          payment_failed_at: new Date().toISOString(),
        })
        .eq("paystack_subscription_code", subscription_code);

      if (updateError) {
        console.error("Error updating subscriber status:", updateError);
      } else {
        console.log("Subscriber marked as payment_failed due to non-renewal");
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
