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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the verification record
    const { data: verification, error: findError } = await supabaseClient
      .from("email_verifications")
      .select("*")
      .eq("token", token)
      .single();

    if (findError || !verification) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid verification token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already verified
    if (verification.verified_at) {
      return new Response(
        JSON.stringify({ success: true, message: "Email already verified" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(verification.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, expired: true, message: "Token has expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabaseClient
      .from("email_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", verification.id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to verify email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update organization email_verified status
    const { error: orgError } = await supabaseClient
      .from("organizations")
      .update({ 
        email_verified: true,
        email_verified_at: new Date().toISOString()
      })
      .eq("user_id", verification.user_id);

    if (orgError) {
      console.error("Org update error:", orgError);
      // Don't fail - the verification itself succeeded
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email verified successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
