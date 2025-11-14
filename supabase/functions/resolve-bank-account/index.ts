import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    
    if (!paystackSecretKey) {
      throw new Error('PAYSTACK_SECRET_KEY not configured');
    }

    const { account_number, bank_code } = await req.json();

    if (!account_number || !bank_code) {
      return new Response(
        JSON.stringify({ error: 'account_number and bank_code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resolving account:', { account_number, bank_code });

    // Resolve bank account using Paystack API
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      {
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const data = await response.json();
    console.log('Paystack response:', data);

    if (!response.ok || !data.status) {
      return new Response(
        JSON.stringify({ 
          error: data.message || 'Failed to resolve account',
          verified: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        verified: true,
        account_name: data.data.account_name,
        account_number: data.data.account_number,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error resolving bank account:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', verified: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
