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
    const body = await req.json();
    const { profile_number, email: inputEmail } = body;

    // Must provide one or the other
    if (!profile_number && !inputEmail) {
      return new Response(
        JSON.stringify({ error: "Provide either a profile_number or an email." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate format if profile_number provided
    if (profile_number && (typeof profile_number !== "string" || profile_number.length !== 4)) {
      return new Response(
        JSON.stringify({ error: "Invalid profile ID format. Must be exactly 4 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch billing profile by profile_number OR email
    let profileQuery = serviceClient
      .from("billing_profiles")
      .select("id, email, full_name, profile_number");

    if (profile_number) {
      profileQuery = profileQuery.eq("profile_number", profile_number.toUpperCase());
    } else {
      profileQuery = profileQuery.eq("email", inputEmail.trim().toLowerCase());
    }

    const { data: profile, error: profileErr } = await profileQuery.maybeSingle();

    console.log(`[DEBUG] Lookup by ${profile_number ? "profile_number" : "email"}: ${profile_number || inputEmail}`);
    console.log(`[DEBUG] Profile found:`, JSON.stringify(profile));

    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: "No billing profile found with the provided details." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch subscribers universally (across all orgs for this email)
    const { data: subscribers, error: subsLookupErr } = await serviceClient
      .from("subscribers")
      .select(`
        id,
        status,
        amount,
        created_at,
        paystack_subscription_code,
        subscription_plans!inner (
          id,
          name,
          org_id
        )
      `)
      .eq("email", profile.email);

    if (subsLookupErr) console.error("Subscriber lookup error:", JSON.stringify(subsLookupErr));
    console.log(`[DEBUG] Profile email: ${profile.email}`);
    console.log(`[DEBUG] Subscribers found: ${subscribers?.length ?? 0}`);

    const formattedPlans: any[] = (subscribers || []).map((s: any) => ({
      id: s.subscription_plans.id,
      subscriber_id: s.id,
      name: s.subscription_plans.name,
      org_id: s.subscription_plans.org_id,
      amount: s.amount / 100, // already stored in kobo
      status: s.status,
      created_at: s.created_at,
      paystack_subscription_code: s.paystack_subscription_code,
    }));

    const aggregatedTxns: any[] = [];
    let totalSpend = 0;
    const orgIds = new Set<string>();

    // 3. Fetch subscription transactions from local database
    const subscriberIds = formattedPlans.map((p) => p.subscriber_id);
    if (subscriberIds.length > 0) {
      const { data: subTxns } = await serviceClient
        .from("transactions")
        .select("*")
        .in("subscriber_id", subscriberIds);

      if (subTxns) {
        subTxns.forEach((tx) => {
          const plan = formattedPlans.find((p) => p.subscriber_id === tx.subscriber_id);
          const planName = plan?.name || "Subscription Payment";
          const amount = Number(tx.amount) / 100;

          if (plan) orgIds.add(plan.org_id);

          aggregatedTxns.push({
            id: tx.id,
            date: tx.paid_at || tx.created_at,
            amount: amount,
            planName: planName,
            orgId: plan?.org_id,
            reference: tx.paystack_reference || tx.id,
            type: "Subscription",
          });
        });

        // Mirror BillingProfileDetail logic: inject initial transaction if webhook missed it
        formattedPlans.forEach((plan) => {
          const planCreatedAt = new Date(plan.created_at).getTime();
          const hasInitialTransaction = aggregatedTxns.some((t) =>
            t.planName === plan.name &&
            Math.abs(new Date(t.date).getTime() - planCreatedAt) < 86400000 // within 24 hours
          );

          if (!hasInitialTransaction && (plan.status === "active" || plan.status === "cancelled")) {
            orgIds.add(plan.org_id);
            aggregatedTxns.push({
              id: `init-${plan.subscriber_id}`,
              date: plan.created_at,
              amount: plan.amount, // Already converted to Naira
              planName: plan.name,
              orgId: plan.org_id,
              reference: plan.paystack_subscription_code || `sub-${plan.subscriber_id}`,
              type: "Subscription",
            });
          }
        });
      }
    }

    // 4. Fetch one-time payment transactions locally
    const { data: otpTxns } = await serviceClient
      .from("one_time_payment_transactions")
      .select("*, one_time_payments(name, org_id)")
      .eq("payer_email", profile.email);

    if (otpTxns) {
      otpTxns.forEach((tx) => {
        const planName = tx.one_time_payments?.name || "Standard Payment";
        const amount = Number(tx.amount); // Already Naira in DB
        const orgId = tx.one_time_payments?.org_id;

        if (orgId) orgIds.add(orgId);

        aggregatedTxns.push({
          id: tx.id,
          date: tx.paid_at || tx.created_at,
          amount: amount,
          planName: planName,
          orgId: orgId,
          reference: tx.paystack_reference || tx.id,
          type: "Standard",
        });
      });
    }

    // 5. Fetch direct one-time payments locally (quick checkout)
    // We already have all orgIds this user interacts with. 
    // Just find any payment linked directly to this email in those orgs.
    const { data: directOtp } = await serviceClient
      .from("one_time_payments")
      .select("*")
      .eq("is_paid", true)
      .eq("paid_by_email", profile.email);

    if (directOtp) {
      directOtp.forEach((tx) => {
        // avoid duplicate by checking reference
        if (!aggregatedTxns.find((t) => t.reference === tx.paystack_reference)) {
          const planName = tx.name || "Standard Payment";
          const amount = Number(tx.amount); // Already Naira
          
          if (tx.org_id) orgIds.add(tx.org_id);

          aggregatedTxns.push({
            id: tx.id,
            date: tx.paid_at || tx.created_at,
            amount: amount,
            planName: planName,
            orgId: tx.org_id,
            reference: tx.paystack_reference || tx.id,
            type: "Standard"
          });
        }
      });
    }

    console.log(`[DEBUG] Total aggregated transactions: ${aggregatedTxns.length}`);

    // 6. Resolve Organization Names
    const orgNameMap: Record<string, string> = {};
    if (orgIds.size > 0) {
      const { data: orgs } = await serviceClient
        .from("organizations")
        .select("id, org_name")
        .in("id", Array.from(orgIds));

      orgs?.forEach((o) => { orgNameMap[o.id] = o.org_name; });
    }

    // 7. Sort by descending date
    aggregatedTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    totalSpend = aggregatedTxns.reduce((sum, tx) => sum + tx.amount, 0);

    // Build Email HTML
    const formattedDate = new Date().toLocaleString("en-US", { dateStyle: "long" });

    // Ensure we send at least an empty statement if no transactions exist
    let transactionsHtml = "";
    if (aggregatedTxns.length === 0) {
      transactionsHtml = `
        <tr>
          <td colspan="4" style="padding: 16px; text-align: center; color: #718096; font-size: 14px;">
            No transactions found for this profile.
          </td>
        </tr>
      `;
    } else {
      transactionsHtml = aggregatedTxns.map(tx => {
        const orgName = tx.orgId ? orgNameMap[tx.orgId] || "Unknown Orgnization" : "Unknown";
        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; font-size: 14px; color: #2d3748;">
              ${new Date(tx.date).toLocaleDateString()}
            </td>
            <td style="padding: 12px 16px; font-size: 14px; color: #2d3748;">
              <strong>${orgName}</strong><br/>
              <span style="font-size: 12px; color: #718096;">${tx.planName} (${tx.type})</span>
            </td>
            <td style="padding: 12px 16px; font-size: 14px; color: #4a5568; font-family: monospace;">
              ${tx.reference}
            </td>
            <td style="padding: 12px 16px; font-size: 14px; color: #2d3748; text-align: right; font-weight: bold;">
              ₦${tx.amount.toLocaleString()}
            </td>
          </tr>
        `;
      }).join("");
    }

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #0A4D4D 0%, #063131 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px;">Financial Statement</h1>
          <p style="color: #e2e8f0; margin-top: 8px; font-size: 15px;">Universal Payer Profile Tracking</p>
        </div>
        <div style="padding: 30px;">
          <div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px;">
            <div>
              <p style="color: #718096; font-size: 13px; margin: 0 0 4px 0; text-transform: uppercase; font-weight: bold;">Statement For</p>
              <p style="color: #2d3748; font-size: 18px; font-weight: bold; margin: 0;">${profile.full_name || 'Valued Customer'}</p>
              <p style="color: #4a5568; font-size: 15px; margin: 4px 0 0 0;">${profile.email}</p>
              <p style="color: #718096; font-size: 13px; margin: 4px 0 0 0;">Profile ID: <strong>${profile_number}</strong></p>
            </div>
            <div style="text-align: right;">
              <p style="color: #718096; font-size: 13px; margin: 0 0 4px 0; text-transform: uppercase;">Total Processed</p>
              <p style="color: #0A4D4D; font-size: 24px; font-weight: bold; margin: 0;">₦${totalSpend.toLocaleString()}</p>
              <p style="color: #a0aec0; font-size: 12px; margin: 4px 0 0 0;">As of ${formattedDate}</p>
            </div>
          </div>

          <h3 style="color: #2d3748; font-size: 16px; margin: 0 0 16px 0;">Transaction History</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background-color: #f7fafc; border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; color: #718096;">Date</th>
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; color: #718096;">Merchant / Plan</th>
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; color: #718096;">Ref</th>
                <th style="padding: 12px 16px; font-size: 12px; text-transform: uppercase; color: #718096; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${transactionsHtml}
            </tbody>
          </table>
          
          <div style="margin-top: 40px; background: #ebf8ff; border-left: 4px solid #4299e1; padding: 16px 20px; border-radius: 0 8px 8px 0;">
            <p style="color: #2b6cb0; margin: 0; font-size: 14px;">
              This statement includes all successful transactions linked to your profile email across all organizations powered by Recurra.
            </p>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #a0aec0; font-size: 12px; margin: 0;">Powered by Recurra &copy; ${new Date().getFullYear()}</p>
        </div>
      </div>
    `;

    // Send email
    const subject = `Your Financial Statement - Recurra Payer Tracking [${profile_number}]`;
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Recurra <no-reply@support.recurrra.com>",
        to: [profile.email],
        subject,
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend delivery failed:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to dispatch statement via email." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Financial statement successfully sent to ${profile.email}`);

    return new Response(
      JSON.stringify({ success: true, email: profile.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Statement tracking error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
