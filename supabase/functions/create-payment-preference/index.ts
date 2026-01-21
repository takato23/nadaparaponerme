// Supabase Edge Function: Create MercadoPago Payment Preference
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

interface RequestBody {
  tier: 'pro' | 'premium';
  currency: 'ARS' | 'USD';
  user_email: string;
  user_id: string;
  idempotency_key?: string;  // Client-generated key to prevent duplicate payments
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
    // Get MercadoPago access token from environment
    const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mercadopagoAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    // Get app URL from environment
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

    // Parse request body
    const body: RequestBody = await req.json();
    const { tier, currency, user_email, user_id, idempotency_key } = body;

    if (!tier || !currency || !user_email || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseServiceKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for recent pending payment for this user+tier (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingPayment } = await supabase
      .from('payment_transactions')
      .select('metadata')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If there's a recent pending payment with init_point, return it (idempotent)
    if (existingPayment?.metadata?.init_point && existingPayment?.metadata?.preference_id) {
      console.log(`Idempotency: Returning existing preference ${existingPayment.metadata.preference_id} for user ${user_id}`);
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
        email: user_email,
      },
      back_urls: {
        success: `${appUrl}?payment=success&tier=${tier}`,
        failure: `${appUrl}?payment=failure`,
        pending: `${appUrl}?payment=pending`,
      },
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      metadata: {
        user_id,
        subscription_tier: tier,
        currency,
      },
      statement_descriptor: 'NTPNP',
      external_reference: `${user_id}_${tier}_${Date.now()}`,
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
    console.log(`Creating new payment transaction for user ${user_id}, tier ${tier}, idempotency_key: ${idempotency_key || 'none'}`);

    const { error: dbError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id,
        amount: price,
        currency,
        status: 'pending',
        provider: 'mercadopago',
        provider_transaction_id: preference.id,
        description: `Suscripción ${plan.name}`,
        metadata: {
          tier,
          preference_id: preference.id,
          init_point: preference.init_point,
          sandbox_init_point: preference.sandbox_init_point,
          idempotency_key: idempotency_key || null,  // Store idempotency key for tracking
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
