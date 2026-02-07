// Supabase Edge Function: Create MercadoPago recurring subscription (preapproval)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveAppUrl } from '../_shared/appUrl.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

type Tier = 'pro' | 'premium';

const PRICES_ARS: Record<Tier, number> = {
  pro: 2999,
  premium: 4999,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase credentials');

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
    const requestedUserEmail: string | undefined = body?.user_email;

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

    const userId = user.id;
    const userEmail = user.email || requestedUserEmail;
    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'Missing user email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');

    const appUrl = resolveAppUrl(req);
    const mpWebhookToken = String(Deno.env.get('MERCADOPAGO_WEBHOOK_TOKEN') || '').trim();
    const mpNotificationUrl = mpWebhookToken
      ? `${supabaseUrl}/functions/v1/mercadopago-webhook?token=${encodeURIComponent(mpWebhookToken)}`
      : `${supabaseUrl}/functions/v1/mercadopago-webhook`;
    const amount = PRICES_ARS[tier];

    // Idempotency: if there's a recent pending subscription intent, return it
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from('payment_transactions')
      .select('provider_transaction_id, metadata, created_at')
      .eq('user_id', userId)
      .eq('provider', 'mercadopago')
      .eq('status', 'pending')
      .eq('currency', 'ARS')
      .eq('amount', amount)
      .eq('description', `Suscripción ${tier}`)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.metadata?.init_point && existing?.provider_transaction_id) {
      return new Response(JSON.stringify({
        id: String(existing.metadata?.preapproval_id || existing.provider_transaction_id),
        init_point: String(existing.metadata.init_point),
        external_reference: String(existing.metadata?.external_reference || existing.provider_transaction_id),
        _idempotent: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const externalReference = `${userId}_${tier}_${Date.now()}`;

    const preapprovalPayload: Record<string, unknown> = {
      reason: `Suscripción ${tier.toUpperCase()} - No Tengo Nada Para Ponerme`,
      external_reference: externalReference,
      payer_email: userEmail,
      back_url: `${appUrl}?subscription=success&provider=mercadopago&tier=${tier}&external_reference=${encodeURIComponent(externalReference)}`,
      // Ensure MP can notify us even when the buyer returns on a different device or doesn't return at all.
      notification_url: mpNotificationUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: amount,
        currency_id: 'ARS',
      },
      status: 'authorized',
    };

    const resp = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(preapprovalPayload),
    });

    const respText = await resp.text();
    if (!resp.ok) {
      console.error('MercadoPago preapproval error:', resp.status, respText);
      throw new Error(`MercadoPago API error: ${resp.status}`);
    }

    const respJson = JSON.parse(respText);
    const preapprovalId = String(respJson?.id || '');
    const initPoint = String(respJson?.init_point || '');

    if (!preapprovalId || !initPoint) {
      console.error('Unexpected MercadoPago preapproval response:', respJson);
      throw new Error('Unexpected MercadoPago response (missing id/init_point)');
    }

    const { error: txError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: userId,
        amount,
        currency: 'ARS',
        status: 'pending',
        provider: 'mercadopago',
        // Use the stable external_reference as the linking key (webhook idempotency uses this).
        provider_transaction_id: externalReference,
        description: `Suscripción ${tier}`,
        metadata: {
          tier,
          init_point: initPoint,
          external_reference: externalReference,
          preapproval_id: preapprovalId,
        },
      });

    if (txError) {
      console.error('Error inserting payment transaction:', txError);
      // Non-blocking: checkout can proceed; webhook will upsert.
    }

    return new Response(JSON.stringify({
      id: preapprovalId,
      init_point: initPoint,
      external_reference: externalReference,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating MP preapproval:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
