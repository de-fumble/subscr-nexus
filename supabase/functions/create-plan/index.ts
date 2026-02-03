import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_PLANS_WITHOUT_PAYSTACK = 3;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('User authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { name, price, interval, description, currency = 'NGN', category } = await req.json()

    if (!name || !price || !interval) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, price, interval' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get organization - first check if user is owner
    let org = null;

    const { data: ownedOrg } = await supabase
      .from('organizations')
      .select('id, paystack_secret_key, paystack_public_key')
      .eq('user_id', user.id)
      .maybeSingle()

    if (ownedOrg) {
      org = ownedOrg;
    } else {
      // Check if user is a staff member
      const { data: membership } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (membership) {
        const { data: memberOrg } = await supabase
          .from('organizations')
          .select('id, paystack_secret_key, paystack_public_key')
          .eq('id', membership.org_id)
          .maybeSingle()
        
        org = memberOrg;
      }
    }

    if (!org) {
      console.error('Organization not found for user:', user.id)
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if org has connected their Paystack keys
    const hasPaystackConnected = !!(org.paystack_secret_key && org.paystack_public_key);
    
    // If not connected, check plan limit
    if (!hasPaystackConnected) {
      const { count, error: countError } = await supabase
        .from('subscription_plans')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('is_active', true);

      if (countError) {
        console.error('Error counting plans:', countError);
      } else if (count !== null && count >= MAX_PLANS_WITHOUT_PAYSTACK) {
        return new Response(
          JSON.stringify({ 
            error: `You have reached the limit of ${MAX_PLANS_WITHOUT_PAYSTACK} plans. Connect your own Paystack API keys in Settings to create unlimited plans.`,
            plan_limit_reached: true
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Use org's Paystack key if available, otherwise fall back to platform default
    const paystackSecretKey = org.paystack_secret_key || Deno.env.get('PAYSTACK_SECRET_KEY')
    
    if (!paystackSecretKey) {
      console.error('No Paystack API key available')
      return new Response(
        JSON.stringify({ error: 'Paystack API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating plan on Paystack:', { name, price, interval, currency, usingOrgKey: !!org.paystack_secret_key })

    // Create plan on Paystack
    const paystackResponse = await fetch('https://api.paystack.co/plan', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        amount: price * 100, // Paystack expects amount in kobo
        interval,
        currency,
        description,
      }),
    })

    const paystackData = await paystackResponse.json()

    if (!paystackResponse.ok) {
      console.error('Paystack error:', paystackData)
      return new Response(
        JSON.stringify({ error: paystackData.message || 'Failed to create plan on Paystack' }),
        { status: paystackResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Paystack plan created:', paystackData.data)

    // Save plan to database
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .insert({
        org_id: org.id,
        paystack_plan_code: paystackData.data.plan_code,
        name,
        description,
        price,
        interval,
        currency,
        category,
      })
      .select()
      .single()

    if (planError) {
      console.error('Database error:', planError)
      return new Response(
        JSON.stringify({ error: 'Failed to save plan to database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Plan saved to database:', plan)

    return new Response(
      JSON.stringify({ 
        success: true, 
        plan,
        paystack_data: paystackData.data,
        using_org_keys: !!org.paystack_secret_key
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
