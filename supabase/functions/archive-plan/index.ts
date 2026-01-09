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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { planId } = await req.json();

    if (!planId) {
      return new Response(
        JSON.stringify({ error: "Missing planId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the plan belongs to the user's organization
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, org_id, name")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: "Plan not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization with Paystack key
    const { data: org } = await supabase
      .from("organizations")
      .select("id, paystack_secret_key")
      .eq("user_id", user.id)
      .single();

    if (!org || org.id !== plan.org_id) {
      return new Response(
        JSON.stringify({ error: "Organization not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paystackSecretKey = org.paystack_secret_key || Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: "Paystack not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active subscribers for this plan
    const { data: subscribers, error: subError } = await serviceClient
      .from("subscribers")
      .select("id, paystack_subscription_code, email, status")
      .eq("plan_id", planId)
      .in("status", ["active", "payment_failed"]);

    if (subError) {
      console.error("Error fetching subscribers:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscribers" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscribers?.length || 0} active subscribers to cancel for plan ${plan.name}`);

    const cancelResults: { email: string; success: boolean; error?: string }[] = [];

    // Cancel each subscription on Paystack
    for (const subscriber of subscribers || []) {
      if (!subscriber.paystack_subscription_code) {
        console.log(`No subscription code for subscriber ${subscriber.email}, marking as cancelled`);
        // Update local status anyway
        await serviceClient
          .from("subscribers")
          .update({ status: "cancelled" })
          .eq("id", subscriber.id);
        cancelResults.push({ email: subscriber.email, success: true });
        continue;
      }

      try {
        const cancelResponse = await fetch(
          `https://api.paystack.co/subscription/disable`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: subscriber.paystack_subscription_code,
              token: "email",
            }),
          }
        );

        const cancelData = await cancelResponse.json();

        if (cancelData.status) {
          console.log(`Successfully cancelled subscription for ${subscriber.email}`);
          // Update local subscriber status
          await serviceClient
            .from("subscribers")
            .update({ status: "cancelled" })
            .eq("id", subscriber.id);
          cancelResults.push({ email: subscriber.email, success: true });
        } else {
          console.error(`Failed to cancel subscription for ${subscriber.email}:`, cancelData);
          cancelResults.push({ 
            email: subscriber.email, 
            success: false, 
            error: cancelData.message || "Paystack cancellation failed" 
          });
        }
      } catch (error) {
        console.error(`Error cancelling subscription for ${subscriber.email}:`, error);
        cancelResults.push({ 
          email: subscriber.email, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    // Archive the plan
    const { error: archiveError } = await supabase
      .from("subscription_plans")
      .update({ is_active: false })
      .eq("id", planId);

    if (archiveError) {
      console.error("Error archiving plan:", archiveError);
      return new Response(
        JSON.stringify({ error: "Failed to archive plan" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const successCount = cancelResults.filter(r => r.success).length;
    const failCount = cancelResults.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Plan archived. ${successCount} subscriptions cancelled${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        cancelResults
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error archiving plan:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
