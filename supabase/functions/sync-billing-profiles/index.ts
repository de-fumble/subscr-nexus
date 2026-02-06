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

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization
    let org = null;
    const { data: ownedOrg } = await supabaseAuth
      .from("organizations")
      .select("id, paystack_secret_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownedOrg) {
      org = ownedOrg;
    } else {
      const { data: membership } = await supabaseAuth
        .from("organization_members")
        .select("org_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membership) {
        const { data: staffOrg } = await supabaseAuth
          .from("organizations")
          .select("id, paystack_secret_key")
          .eq("id", membership.org_id)
          .maybeSingle();
        org = staffOrg;
      }
    }

    if (!org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paystackSecretKey = org.paystack_secret_key || Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: "Paystack not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for DB writes (billing_profiles inserts need it)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get org's plan codes
    const { data: plans } = await supabaseAuth
      .from("subscription_plans")
      .select("id, paystack_plan_code")
      .eq("org_id", org.id);

    const planCodes = new Set((plans || []).map((p: any) => p.paystack_plan_code).filter(Boolean));
    const planIdByCode = new Map((plans || []).map((p: any) => [p.paystack_plan_code, p.id]));

    // Fetch ALL subscriptions from Paystack (paginated)
    let allSubscriptions: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `https://api.paystack.co/subscription?perPage=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await res.json();

      if (!data.status || !data.data?.length) {
        hasMore = false;
        break;
      }

      const filtered = data.data.filter((sub: any) =>
        sub?.plan && planCodes.has(sub.plan.plan_code)
      );
      allSubscriptions = [...allSubscriptions, ...filtered];

      if (data.data.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log(`Found ${allSubscriptions.length} subscriptions for org ${org.id}`);

    let created = 0;
    let linked = 0;
    let skipped = 0;

    // Group by email to avoid duplicates
    const emailMap = new Map<string, any>();
    for (const sub of allSubscriptions) {
      const email = sub.customer?.email;
      if (!email) continue;
      if (!emailMap.has(email)) {
        emailMap.set(email, sub);
      }
    }

    for (const [email, sub] of emailMap) {
      const customer = sub.customer || {};
      const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || null;

      // Check if billing profile already exists
      const { data: existingProfile } = await supabaseAdmin
        .from("billing_profiles")
        .select("id")
        .eq("email", email)
        .single();

      let profileId: string;

      if (existingProfile) {
        profileId = existingProfile.id;
        skipped++;
      } else {
        // Create new billing profile (trigger auto-generates 4-digit number)
        const { data: newProfile, error: insertErr } = await supabaseAdmin
          .from("billing_profiles")
          .insert({
            email,
            full_name: fullName,
          })
          .select("id, profile_number")
          .single();

        if (insertErr) {
          console.error(`Error creating profile for ${email}:`, insertErr);
          continue;
        }

        profileId = newProfile.id;
        created++;
        console.log(`Created billing profile #${newProfile.profile_number} for ${email}`);
      }

      // Link to organization if not already linked
      const { data: existingLink } = await supabaseAdmin
        .from("billing_profile_organizations")
        .select("id")
        .eq("billing_profile_id", profileId)
        .eq("org_id", org.id)
        .single();

      if (!existingLink) {
        await supabaseAdmin.from("billing_profile_organizations").insert({
          billing_profile_id: profileId,
          org_id: org.id,
        });
        linked++;
      }

      // Also sync subscriber records to local DB
      for (const s of allSubscriptions.filter((x: any) => x.customer?.email === email)) {
        const planCode = s.plan?.plan_code;
        const localPlanId = planIdByCode.get(planCode);
        if (!localPlanId) continue;

        const subCode = s.subscription_code;

        // Check if subscriber already exists locally
        const { data: existingSub } = await supabaseAdmin
          .from("subscribers")
          .select("id")
          .eq("paystack_subscription_code", subCode)
          .single();

        if (!existingSub) {
          const amountInKobo = typeof s.amount === "number" ? s.amount : (s.plan?.amount ?? 0);
          await supabaseAdmin.from("subscribers").insert({
            plan_id: localPlanId,
            email,
            customer_name: fullName || email,
            paystack_customer_code: customer.customer_code || null,
            paystack_subscription_code: subCode,
            paystack_authorization_code: s.authorization?.authorization_code || null,
            amount: amountInKobo,
            status: s.status || "active",
            next_payment_date: s.next_payment_date || null,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_paystack_subscribers: allSubscriptions.length,
          unique_emails: emailMap.size,
          profiles_created: created,
          profiles_already_existed: skipped,
          org_links_created: linked,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error syncing billing profiles:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
