// Supabase Edge Function: Process MercadoPago preapproval after user returns (fallback to webhook)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

type Tier = 'pro' | 'premium';

const PRICES_ARS: Record<Tier, number> = {
  pro: 2999,
  premium: 4999,
};

const LIMITS_BY_TIER: Record<'free' | Tier, number> = {
  free: 200,
  pro: 300,
  premium: 400,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase credentials');

    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');

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

    const body = await req.json().catch(() => ({}));
    const externalReference = String(body?.external_reference || '');
    if (!externalReference) {
      return new Response(JSON.stringify({ error: 'Missing external_reference' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parts = externalReference.split('_');
    const externalUserId = parts[0] || '';
    const externalTier = parts[1] as Tier | undefined;
    if (!externalUserId || (externalTier !== 'pro' && externalTier !== 'premium')) {
      return new Response(JSON.stringify({ error: 'Invalid external_reference format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (externalUserId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load transaction row to find the MP preapproval id.
    const { data: txRow, error: txError } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, status, metadata')
      .eq('provider', 'mercadopago')
      .eq('provider_transaction_id', externalReference)
      .maybeSingle();

    if (txError) {
      console.error('payment_transactions select error:', txError);
    }

    // Idempotency: if we've already approved this tx, return OK.
    if (txRow?.status === 'approved') {
      return new Response(JSON.stringify({ ok: true, idempotent: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata: any = txRow?.metadata || {};
    const preapprovalId = String(metadata?.preapproval_id || '');
    if (!preapprovalId) {
      return new Response(JSON.stringify({ error: 'Missing preapproval_id for external_reference' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const preapprovalResp = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { 'Authorization': `Bearer ${mpAccessToken}` },
    });

    if (!preapprovalResp.ok) {
      const text = await preapprovalResp.text();
      console.error('MercadoPago preapproval fetch error:', preapprovalResp.status, text);
      return new Response(JSON.stringify({ error: 'No se pudo verificar la suscripción con MercadoPago' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preapproval: any = await preapprovalResp.json();

    const mpExternalRef = String(preapproval?.external_reference || '');
    const status = String(preapproval?.status || '');
    const nextPaymentDate = preapproval?.next_payment_date ? String(preapproval.next_payment_date) : null;
    const recurringCurrency = String(preapproval?.auto_recurring?.currency_id || 'ARS');
    const recurringAmount = Number(preapproval?.auto_recurring?.transaction_amount || 0);

    if (mpExternalRef !== externalReference) {
      return new Response(JSON.stringify({ error: 'external_reference mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate recurring amount/currency against expected plan.
    if (recurringCurrency !== 'ARS') {
      console.error('Preapproval currency mismatch:', { expected: 'ARS', got: recurringCurrency, externalReference, preapprovalId });
      return new Response(JSON.stringify({ error: 'Currency mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (Number(recurringAmount) !== Number(PRICES_ARS[externalTier])) {
      console.error('Preapproval amount mismatch:', { expected: PRICES_ARS[externalTier], got: recurringAmount, externalReference, preapprovalId });
      return new Response(JSON.stringify({ error: 'Amount mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const periodEnd = nextPaymentDate ? new Date(nextPaymentDate) : new Date(now);
    if (!nextPaymentDate) periodEnd.setMonth(periodEnd.getMonth() + 1);

    const txStatus =
      status === 'authorized' ? 'approved'
        : status === 'cancelled' ? 'cancelled'
          : status === 'paused' ? 'pending'
            : 'pending';

    // Upsert transaction row (ensures we have a stable record even if the original insert failed).
    const { error: upsertTxError } = await supabaseAdmin
      .from('payment_transactions')
      .upsert({
        user_id: user.id,
        amount: PRICES_ARS[externalTier],
        currency: 'ARS',
        status: txStatus,
        provider: 'mercadopago',
        provider_transaction_id: externalReference,
        description: `Suscripción ${externalTier} (MercadoPago)`,
        metadata: {
          external_reference: externalReference,
          preapproval_id: preapprovalId,
          preapproval_status: status,
          next_payment_date: nextPaymentDate,
          processed_via: 'process-mp-preapproval',
        },
      }, { onConflict: 'provider,provider_transaction_id' });

    if (upsertTxError) {
      console.error('payment_transactions upsert error:', upsertTxError);
    }

    if (status === 'authorized') {
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          tier: externalTier,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          payment_method: 'mercadopago_credit_card',
          mercadopago_subscription_id: String(preapprovalId),
          cancel_at_period_end: false,
          canceled_at: null,
          updated_at: now.toISOString(),
        });

      if (subError) {
        console.error('subscriptions upsert error:', subError);
        throw subError;
      }

      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEndMetrics = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const { error: metricsError } = await supabaseAdmin
        .from('usage_metrics')
        .upsert({
          user_id: user.id,
          subscription_tier: externalTier,
          ai_generations_used: 0,
          ai_generations_limit: LIMITS_BY_TIER[externalTier],
          period_start: periodStart.toISOString(),
          period_end: periodEndMetrics.toISOString(),
          last_reset: now.toISOString(),
        }, { onConflict: 'user_id,period_start' });

      if (metricsError) {
        console.error('usage_metrics upsert error:', metricsError);
      }
    }

    if (status === 'cancelled') {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'canceled',
          cancel_at_period_end: true,
          canceled_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', user.id);
    }

    return new Response(JSON.stringify({ ok: true, status }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing MP preapproval:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

