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
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { event_type } = await req.json();

    if (!event_type || !["signup", "login", "logout"].includes(event_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid event_type. Must be signup, login, or logout." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only send to org owners — check if this user owns an organization
    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("id, org_name, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (orgError) {
      console.error("Org lookup error:", orgError);
      return new Response(
        JSON.stringify({ error: "Failed to check organization ownership" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Not an org owner (could be staff/admin member or user account) — skip silently
    if (!org) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Not an organization owner" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientEmail = org.email;
    const orgName = org.org_name;
    const now = new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos", dateStyle: "full", timeStyle: "short" });

    let subject = "";
    let htmlBody = "";

    if (event_type === "signup") {
      subject = `Welcome to Recurra, ${orgName}! 🎉`;
      htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to Recurra!</h1>
            <p style="color: #a0aec0; margin-top: 8px; font-size: 14px;">Your subscription management journey begins now</p>
          </div>
          <div style="padding: 30px;">
            <p style="color: #2d3748; font-size: 16px; line-height: 1.6;">Hi <strong>${orgName}</strong>,</p>
            <p style="color: #4a5568; font-size: 15px; line-height: 1.6;">
              Your account has been successfully created on <strong>${now}</strong>. 
              You're now ready to start managing your subscriptions, plans, and billing with ease.
            </p>
            <div style="background: #f7fafc; border-left: 4px solid #4fd1c5; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
              <p style="color: #2d3748; margin: 0; font-size: 14px;"><strong>Next steps:</strong></p>
              <ul style="color: #4a5568; font-size: 14px; padding-left: 20px; margin: 8px 0 0 0;">
                <li>Add your Paystack API keys</li>
                <li>Create your first subscription plan</li>
                <li>Share your plan link with subscribers</li>
              </ul>
            </div>
            <p style="color: #718096; font-size: 13px; margin-top: 30px;">
              If you didn't create this account, please contact our support team immediately.
            </p>
          </div>
          <div style="background: #f7fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Recurra. All rights reserved.</p>
          </div>
        </div>
      `;
    } else if (event_type === "login") {
      subject = `Login Alert — ${orgName}`;
      htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔐 Login Detected</h1>
          </div>
          <div style="padding: 30px;">
            <p style="color: #2d3748; font-size: 16px; line-height: 1.6;">Hi <strong>${orgName}</strong>,</p>
            <p style="color: #4a5568; font-size: 15px; line-height: 1.6;">
              A login to your Recurra account was detected on <strong>${now}</strong>.
            </p>
            <div style="background: #f0fff4; border-left: 4px solid #48bb78; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
              <p style="color: #276749; margin: 0; font-size: 14px;">
                ✅ If this was you, no action is needed.
              </p>
            </div>
            <div style="background: #fff5f5; border-left: 4px solid #fc8181; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
              <p style="color: #9b2c2c; margin: 0; font-size: 14px;">
                ⚠️ If this wasn't you, please reset your password immediately and contact support.
              </p>
            </div>
          </div>
          <div style="background: #f7fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Recurra. All rights reserved.</p>
          </div>
        </div>
      `;
    } else if (event_type === "logout") {
      subject = `Logout Notification — ${orgName}`;
      htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">👋 Signed Out</h1>
          </div>
          <div style="padding: 30px;">
            <p style="color: #2d3748; font-size: 16px; line-height: 1.6;">Hi <strong>${orgName}</strong>,</p>
            <p style="color: #4a5568; font-size: 15px; line-height: 1.6;">
              You were signed out of your Recurra account on <strong>${now}</strong>.
            </p>
            <div style="background: #ebf8ff; border-left: 4px solid #4299e1; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
              <p style="color: #2b6cb0; margin: 0; font-size: 14px;">
                If you didn't initiate this logout, please sign in and reset your password.
              </p>
            </div>
          </div>
          <div style="background: #f7fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Recurra. All rights reserved.</p>
          </div>
        </div>
      `;
    }

    // Send email via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Recurra <onboarding@resend.dev>",
        to: [recipientEmail],
        subject,
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Email sent for ${event_type} to ${recipientEmail}:`, resendData);

    return new Response(
      JSON.stringify({ success: true, email_id: resendData.id }),
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
