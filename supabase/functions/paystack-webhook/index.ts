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

     // Create or link billing profile
     const customerEmail = customer.email;
     const customerName = customer.first_name && customer.last_name 
       ? `${customer.first_name} ${customer.last_name}` 
       : null;

     // Check if billing profile exists
     const { data: existingProfile } = await supabase
       .from("billing_profiles")
       .select("id")
       .eq("email", customerEmail)
       .single();

    let billingProfileId: string | null = null;

     if (existingProfile) {
       billingProfileId = existingProfile.id;
     } else {
       // Create new billing profile
       const { data: newProfile, error: profileError } = await supabase
         .from("billing_profiles")
         .insert({
           email: customerEmail,
           full_name: customerName,
         })
         .select("id")
         .single();

       if (profileError) {
         console.error("Error creating billing profile:", profileError);
       } else {
         billingProfileId = newProfile.id;
       }
     }

     // Get org_id from the plan
     const { data: planData } = await supabase
       .from("subscription_plans")
       .select("org_id")
       .eq("id", planId)
       .single();

     if (planData && billingProfileId) {
       // Link billing profile to organization if not already linked
       const { data: existingLink } = await supabase
         .from("billing_profile_organizations")
         .select("id")
         .eq("billing_profile_id", billingProfileId)
         .eq("org_id", planData.org_id)
         .single();

       if (!existingLink) {
         await supabase.from("billing_profile_organizations").insert({
           billing_profile_id: billingProfileId,
           org_id: planData.org_id,
         });
       }
     }
    }

    // Handle successful charge - clear any failed payment state
    if (event.event === "charge.success" && event.data.customer) {
      const { reference, amount, customer, paid_at, authorization, metadata } = event.data;

      // ── ONE-TIME PAYMENT PATH ────────────────────────────────────────────
      // Check if this is a one-time/standard payment via metadata
      const isOneTimePayment = metadata?.payment_type === "one_time" || !!metadata?.payment_id;
      
      if (isOneTimePayment && metadata?.payment_id) {
        console.log("Processing one-time payment charge.success:", reference);
        
        // Fetch the org's paystack key to verify with the right key
        const { data: otpPayment } = await supabase
          .from("one_time_payments")
          .select("id, org_id")
          .eq("id", metadata.payment_id)
          .single();

        if (otpPayment) {
          // Check for duplicate before inserting
          const { data: existing } = await supabase
            .from("one_time_payment_transactions")
            .select("id")
            .eq("paystack_reference", reference)
            .maybeSingle();

          if (!existing) {
            const customerName = metadata?.customer_name
              || (customer.first_name ? `${customer.first_name} ${customer.last_name || ""}`.trim() : customer.email);

            const { error: otpInsertError } = await supabase
              .from("one_time_payment_transactions")
              .insert({
                payment_id: otpPayment.id,
                amount: amount / 100, // Convert kobo to naira
                payer_email: customer.email,
                payer_name: customerName,
                paystack_reference: reference,
                paid_at: paid_at || new Date().toISOString(),
              });

            if (otpInsertError) {
              console.error("Error recording one-time payment transaction:", otpInsertError);
            } else {
              console.log("One-time payment transaction recorded via webhook:", reference);
            }
          } else {
            console.log("One-time payment transaction already recorded:", reference);
          }
        } else {
          console.warn("One-time payment not found in DB for payment_id:", metadata.payment_id);
        }
        
        // Return early - don't process as subscription
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ── SUBSCRIPTION PAYMENT PATH ────────────────────────────────────────
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

       // Update billing profile organization total_paid
       const { data: subData } = await supabase
         .from("subscribers")
         .select("email, subscription_plans(org_id)")
         .eq("id", subscriber.id)
         .single();

       if (subData) {
         const { data: profile } = await supabase
           .from("billing_profiles")
           .select("id")
           .eq("email", subData.email)
           .single();

         if (profile) {
           const orgId = (subData.subscription_plans as any)?.org_id;
           if (orgId) {
             // Get current total and add new amount
             const { data: bpo } = await supabase
               .from("billing_profile_organizations")
               .select("total_paid")
               .eq("billing_profile_id", profile.id)
               .eq("org_id", orgId)
               .single();

             const newTotal = (bpo?.total_paid || 0) + amount;

             await supabase
               .from("billing_profile_organizations")
               .update({ total_paid: newTotal })
               .eq("billing_profile_id", profile.id)
               .eq("org_id", orgId);
           }
         }
       }
      }
    }

    // Handle failed charge - mark for retry with failure reason
    if (event.event === "charge.failed" && event.data.customer) {
      const { reference, amount, customer, gateway_response, message } = event.data;
      const failureReason = gateway_response || message || "Payment declined by bank";
      console.log(`Charge failed for customer ${customer.customer_code}: ${failureReason}`);

      // Find subscriber by customer code
      const { data: subscriber } = await supabase
        .from("subscribers")
        .select("id, retry_count")
        .eq("paystack_customer_code", customer.customer_code)
        .single();

      if (subscriber) {
        // Mark payment as failed for retry mechanism with reason
        const { error: updateError } = await supabase
          .from("subscribers")
          .update({
            payment_failed_at: new Date().toISOString(),
            failure_reason: failureReason,
          })
          .eq("id", subscriber.id);

        if (updateError) {
          console.error("Error marking payment as failed:", updateError);
        } else {
          console.log(`Payment marked as failed for subscriber ${subscriber.id}: ${failureReason}`);
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
