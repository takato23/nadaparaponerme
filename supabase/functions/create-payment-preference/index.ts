// Supabase Edge Function: Create MercadoPago Payment Preference
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveAppUrl } from '../_shared/appUrl.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

interface RequestBody {
  tier: 'pro' | 'premium';
  currency: 'ARS' | 'USD';
  idempotency_key?: string;  // Client-generated key to prevent duplicate payments
  // Backwards-compat: older clients sent these. We'll validate if provided.
  user_email?: string;
  user_id?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly_ars: number;
  price_monthly_usd: number;
}

const PLANS: Record<string, SubscriptionPlan> = {
  pro: {
    id: 'pro',
    name: 'Pro',
    price_monthly_ars: 2999,
    price_monthly_usd: 9.99,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price_monthly_ars: 4999,
    price_monthly_usd: 16.99,
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }

    // Get MercadoPago access token from environment
    const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mercadopagoAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    // Resolve callback base URL
    const appUrl = resolveAppUrl(req);
    const mpWebhookToken = String(Deno.env.get('MERCADOPAGO_WEBHOOK_TOKEN') || '').trim();
    const mpNotificationUrl = mpWebhookToken
      ? `${supabaseUrl}/functions/v1/mercadopago-webhook?token=${encodeURIComponent(mpWebhookToken)}`
      : `${supabaseUrl}/functions/v1/mercadopago-webhook`;

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
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

    // Parse request body
    const body: RequestBody = await req.json();
    const { tier, currency, idempotency_key, user_email, user_id } = body;

    if (!tier || !currency) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user_id && user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const userEmail = user.email || user_email;
    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'Missing user email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get plan details
    const plan = PLANS[tier];
    if (!plan) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription tier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate price based on currency
    const price = currency === 'ARS' ? plan.price_monthly_ars : plan.price_monthly_usd;

    // ============================================================================
    // IDEMPOTENCY CHECK: If we already have a pending payment for this key, return it
    // ============================================================================
    // Check for recent pending payment for this user+plan (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingPayment } = await supabaseAdmin
      .from('payment_transactions')
      .select('metadata')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('provider', 'mercadopago')
      .eq('currency', currency)
      .eq('amount', price)
      .eq('description', `Suscripción ${plan.name}`)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If there's a recent pending payment with init_point, return it (idempotent)
    if (existingPayment?.metadata?.init_point && existingPayment?.metadata?.preference_id) {
      console.log(`Idempotency: Returning existing preference ${existingPayment.metadata.preference_id} for user ${userId}`);
      return new Response(
        JSON.stringify({
          id: existingPayment.metadata.preference_id,
          init_point: existingPayment.metadata.init_point,
          sandbox_init_point: existingPayment.metadata.sandbox_init_point,
          _idempotent: true,  // Flag to indicate this was a cached response
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // ============================================================================

    // Determine if we should use auto_return
    // MercadoPago requires HTTPS URLs for auto_return, not localhost
    const isProductionUrl = appUrl.startsWith('https://') && !appUrl.includes('localhost');

    // Stable identifier to link webhook + DB row. This is returned by MP in payment.external_reference.
    const externalReference = `${userId}_${tier}_${Date.now()}`;

    // Create MercadoPago preference
    const preferenceData: any = {
      items: [
        {
          title: `Suscripción ${plan.name} - No Tengo Nada Para Ponerme`,
          description: `Suscripción mensual al plan ${plan.name}`,
          quantity: 1,
          unit_price: price,
          currency_id: currency,
        },
      ],
      payer: {
        email: userEmail,
      },
      back_urls: {
        success: `${appUrl}?payment=success&tier=${tier}`,
        failure: `${appUrl}?payment=failure`,
        pending: `${appUrl}?payment=pending`,
      },
      notification_url: mpNotificationUrl,
      metadata: {
        user_id: userId,
        subscription_tier: tier,
        currency,
      },
      statement_descriptor: 'NTPNP',
      external_reference: externalReference,
    };

    // Only set auto_return for production URLs
    if (isProductionUrl) {
      preferenceData.auto_return = 'approved';
    }

    // Call MercadoPago API to create preference
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mercadopagoAccessToken}`,
        ...(idempotency_key ? { 'X-Idempotency-Key': idempotency_key } : {}),
      },
      body: JSON.stringify(preferenceData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('MercadoPago API error:', errorData);
      console.error('Request payload:', JSON.stringify(preferenceData, null, 2));
      console.error('Response status:', response.status);

      // Try to parse the error as JSON for more details
      try {
        const errorJson = JSON.parse(errorData);
        throw new Error(`MercadoPago API error: ${response.status} - ${JSON.stringify(errorJson)}`);
      } catch (e) {
        throw new Error(`MercadoPago API error: ${response.status} - ${errorData}`);
      }
    }

    const preference = await response.json();

    // Store payment intent in database (supabase client already created above)
    console.log(`Creating new payment transaction for user ${userId}, tier ${tier}, idempotency_key: ${idempotency_key || 'none'}`);

    const { error: dbError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: userId,
        amount: price,
        currency,
        status: 'pending',
        provider: 'mercadopago',
        // Use our external_reference as the stable link key. The payment id is only known after approval.
        provider_transaction_id: externalReference,
        description: `Suscripción ${plan.name}`,
        metadata: {
          tier,
          preference_id: preference.id,
          init_point: preference.init_point,
          sandbox_init_point: preference.sandbox_init_point,
          idempotency_key: idempotency_key || null,  // Store idempotency key for tracking
          external_reference: externalReference,
        },
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({
        id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating payment preference:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
