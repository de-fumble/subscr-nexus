import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateOTP(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return num.toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, user_id } = await req.json();

    if (!email || !user_id) {
      return new Response(
        JSON.stringify({ error: "Email and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limiting: max 2 OTP requests within 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: recentRequests, error: fetchError } = await supabaseClient
      .from("email_verifications")
      .select("id, request_count, last_requested_at, created_at")
      .eq("user_id", user_id)
      .eq("email", email)
      .is("verified_at", null)
      .gte("last_requested_at", twoHoursAgo)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw new Error("Failed to check rate limits");
    }

    // If there's an existing unverified record within the 2-hour window
    if (recentRequests && recentRequests.length > 0) {
      const existing = recentRequests[0];
      
      if (existing.request_count >= 2) {
        // Calculate when they can try again
        const lastRequested = new Date(existing.last_requested_at);
        const canRetryAt = new Date(lastRequested.getTime() + 2 * 60 * 60 * 1000);
        
        return new Response(
          JSON.stringify({ 
            error: "rate_limited",
            message: "You have exhausted your OTP attempts. Please try again later.",
            can_retry_at: canRetryAt.toISOString()
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update existing record with new OTP
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      const { error: updateError } = await supabaseClient
        .from("email_verifications")
        .update({
          otp_code: otp,
          expires_at: expiresAt.toISOString(),
          request_count: existing.request_count + 1,
          last_requested_at: new Date().toISOString(),
          otp_attempts: 0, // Reset attempts for new OTP
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error("Failed to update OTP");
      }

      // Send email and log it
      await sendOTPEmail(RESEND_API_KEY, email, otp, supabaseClient);

      return new Response(
        JSON.stringify({ 
          success: true, 
          expires_at: expiresAt.toISOString(),
          request_count: existing.request_count + 1,
          max_requests: 2
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No existing record — create new one
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const token = crypto.randomUUID();

    const { error: insertError } = await supabaseClient
      .from("email_verifications")
      .insert({
        user_id,
        email,
        token,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        request_count: 1,
        last_requested_at: new Date().toISOString(),
        otp_attempts: 0,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to create OTP record");
    }

    // Send email and log it
    await sendOTPEmail(RESEND_API_KEY, email, otp, supabaseClient);

    return new Response(
      JSON.stringify({ 
        success: true, 
        expires_at: expiresAt.toISOString(),
        request_count: 1,
        max_requests: 2
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendOTPEmail(apiKey: string, email: string, otp: string, supabaseClient?: any) {
  const htmlBody = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Verify Your Email</h1>
        <p style="color: #a0aec0; margin-top: 8px; font-size: 14px;">Enter this code to complete verification</p>
      </div>
      <div style="padding: 30px; text-align: center;">
        <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Use the following code to verify your email address. This code expires in <strong>5 minutes</strong>.
        </p>
        <div style="background: #f7fafc; border: 2px dashed #4fd1c5; border-radius: 12px; padding: 24px; margin: 24px 0; display: inline-block; min-width: 200px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #1a1a2e; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #718096; font-size: 13px; margin-top: 24px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>
      <div style="background: #f7fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #a0aec0; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Recurra. All rights reserved.</p>
      </div>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "Recurra <no-reply@support.recurrra.com>",
      to: [email],
      subject: "Your Recurra Verification Code",
      html: htmlBody,
    }),
  });

  const resendData = await res.json();

  // Log to email_logs
  if (supabaseClient) {
    const { error: logErr } = await supabaseClient.from("email_logs").insert({
      recipient_email: email,
      subject: "Your Recurra Verification Code",
      email_type: "otp",
      status: res.ok ? "sent" : "failed",
      resend_id: resendData.id ?? null,
      error_message: res.ok ? null : JSON.stringify(resendData),
    });
    if (logErr) console.error("Failed to log email:", logErr);
  }

  if (!res.ok) {
    console.error("Resend error:", resendData);
    throw new Error("Failed to send OTP email");
  }
}
