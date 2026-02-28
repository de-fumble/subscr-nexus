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

    const { email, user_id, otp } = await req.json();

    if (!email || !user_id || !otp) {
      return new Response(
        JSON.stringify({ success: false, message: "Email, user_id, and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the latest unverified OTP record for this user/email
    const { data: verification, error: findError } = await supabaseClient
      .from("email_verifications")
      .select("*")
      .eq("user_id", user_id)
      .eq("email", email)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError || !verification) {
      return new Response(
        JSON.stringify({ success: false, message: "No pending verification found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(verification.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, expired: true, message: "OTP has expired. Please request a new one." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check OTP
    if (verification.otp_code !== otp) {
      // Increment attempts
      await supabaseClient
        .from("email_verifications")
        .update({ otp_attempts: (verification.otp_attempts || 0) + 1 })
        .eq("id", verification.id);

      return new Response(
        JSON.stringify({ success: false, message: "Invalid OTP code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OTP matches — mark as verified
    const { error: updateError } = await supabaseClient
      .from("email_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", verification.id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to verify");
    }

    // Update organization email_verified status
    await supabaseClient
      .from("organizations")
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      })
      .eq("user_id", user_id);

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
