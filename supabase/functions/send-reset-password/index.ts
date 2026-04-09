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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, clientOrigin } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = clientOrigin || req.headers.get("origin") || "https://recurrra.lovable.app";

    // Generate a reset link using Supabase's built-in auth
    const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${origin}/reset-password`,
      },
    });

    if (linkError || !linkData) {
      console.error("Link generation error:", linkError);
      // Don't reveal if email exists
      return new Response(
        JSON.stringify({ success: true, message: "If the email exists, a reset link has been sent." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let resetLink = linkData.properties?.action_link || `${origin}/reset-password`;

    try {
      if (resetLink.includes("redirect_to=") && origin) {
        const url = new URL(resetLink);
        url.searchParams.set("redirect_to", `${origin}/reset-password`);
        resetLink = url.toString();
      }
    } catch (e) {
      console.error("Error patching redirect_to", e);
    }

    // Send custom email via Resend
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Reset Your Password</h1>
          <p style="color: #a0aec0; margin-top: 8px; font-size: 14px;">We received a request to reset your password</p>
        </div>
        <div style="padding: 30px;">
          <p style="color: #4a5568; font-size: 15px; line-height: 1.6;">
            Click the button below to set a new password. This link will expire in 30 minutes.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" 
               style="background: linear-gradient(135deg, #4fd1c5, #38b2ac); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <div style="background: #fff5f5; border-left: 4px solid #fc8181; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="color: #9b2c2c; margin: 0; font-size: 14px;">
              ⚠️ If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </div>
          <p style="color: #718096; font-size: 13px; margin-top: 20px;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetLink}" style="color: #4fd1c5; word-break: break-all;">${resetLink}</a>
          </p>
        </div>
        <div style="background: #f7fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #a0aec0; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Recurra. All rights reserved.</p>
        </div>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Recurra <no-reply@support.recurrra.com>",
        to: [email],
        subject: "Reset Your Recurra Password",
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json();

    // Log the email attempt (fire-and-forget)
    const { data: orgRow } = await supabaseClient
      .from("organizations")
      .select("id, org_name")
      .eq("email", email)
      .maybeSingle();

    const { error: logErr } = await supabaseClient.from("email_logs").insert({
      recipient_email: email,
      recipient_name: orgRow?.org_name ?? null,
      org_id: orgRow?.id ?? null,
      subject: "Reset Your Recurra Password",
      email_type: "password_reset",
      status: resendRes.ok ? "sent" : "failed",
      resend_id: resendData.id ?? null,
      error_message: resendRes.ok ? null : JSON.stringify(resendData),
    });

    if (logErr) console.error("Failed to log email:", logErr);

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      // Still return success to not reveal email existence
    }

    return new Response(
      JSON.stringify({ success: true, message: "If the email exists, a reset link has been sent." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: true, message: "If the email exists, a reset link has been sent." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
