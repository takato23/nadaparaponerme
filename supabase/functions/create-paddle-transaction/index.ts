// Supabase Edge Function: Create Paddle transaction (international checkout)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveAppUrl } from '../_shared/appUrl.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

type Tier = 'pro' | 'premium';

const PLANS: Record<Tier, { amount_usd: number }> = {
  pro: { amount_usd: 9.99 },
  premium: { amount_usd: 16.99 },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate caller identity using user JWT (Authorization header).
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client for DB writes (bypass RLS).
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const tier: Tier | undefined = body?.tier;
    const requestedUserId: string | undefined = body?.user_id;

    if (!tier) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (tier !== 'pro' && tier !== 'premium') {
      return new Response(JSON.stringify({ error: 'Invalid tier' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (requestedUserId && user.id !== requestedUserId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paddleApiKey = Deno.env.get('PADDLE_API_KEY');
    if (!paddleApiKey) throw new Error('PADDLE_API_KEY not configured');

    const appUrl = resolveAppUrl(req);
    // Paddle will append `?_ptxn=txn_...` to this URL.
    const checkoutUrl = `${appUrl}/pay?tier=${tier}`;

    const priceId = tier === 'pro'
      ? Deno.env.get('PADDLE_PRICE_ID_PRO')
      : Deno.env.get('PADDLE_PRICE_ID_PREMIUM');

    if (!priceId) {
      throw new Error(`Missing Paddle price id for tier ${tier}`);
    }

    const payload = {
      items: [{ price_id: priceId, quantity: 1 }],
      customer: user.email ? { email: user.email } : undefined,
      custom_data: {
        user_id: user.id,
        tier,
      },
      checkout: {
        url: checkoutUrl,
      },
    };

    const resp = await fetch('https://api.paddle.com/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${paddleApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const respText = await resp.text();
    if (!resp.ok) {
      console.error('Paddle API error:', resp.status, respText);
      throw new Error(`Paddle API error: ${resp.status}`);
    }

    const respJson = JSON.parse(respText);
    const transactionId = String(respJson?.data?.id || '');
    const transactionCheckoutUrl = String(respJson?.data?.checkout?.url || '');

    if (!transactionId || !transactionCheckoutUrl) {
      console.error('Unexpected Paddle response:', respJson);
      throw new Error('Unexpected Paddle response (missing id/checkout.url)');
    }

    // Create a pending transaction row. Activation happens via webhook.
    const { error: txError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        amount: PLANS[tier].amount_usd,
        currency: 'USD',
        status: 'pending',
        provider: 'paddle',
        provider_transaction_id: transactionId,
        description: `Suscripción ${tier} (Paddle)`,
        metadata: {
          tier,
          checkout_url: transactionCheckoutUrl,
        },
      });

    if (txError) {
      console.error('Error inserting payment transaction:', txError);
      // Non-blocking: checkout can proceed, webhook will upsert if needed.
    }

    return new Response(JSON.stringify({
      transaction_id: transactionId,
      checkout_url: transactionCheckoutUrl,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating Paddle transaction:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
