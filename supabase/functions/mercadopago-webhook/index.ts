// Supabase Edge Function: MercadoPago Webhook Handler
// With idempotency protection to prevent duplicate processing
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-signature, x-request-id',
};

interface WebhookPayload {
  action: string;
  api_version: string;
  data: {
    id: string;
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: string;
  user_id: string;
}

interface PaymentData {
  id: number;
  status: string;
  status_detail: string;
  external_reference: string;
  metadata: {
    user_id: string;
    subscription_tier: 'pro' | 'premium';
    currency: string;
  };
  transaction_amount: number;
  currency_id: string;
  payment_method_id: string;
  date_approved: string | null;
}

const LIMITS_BY_TIER: Record<'free' | 'pro' | 'premium', number> = {
  free: 200,
  pro: 300,
  premium: 400,
};

const PRICES: Record<'pro' | 'premium', { ars: number; usd: number }> = {
  pro: { ars: 2999, usd: 9.99 },
  premium: { ars: 4999, usd: 16.99 },
};

function parseMpSignature(header: string): { ts: string; v1: string } | null {
  // Examples:
  // "ts=1742505638683,v1=abcdef..."
  // "ts=1742505638683; v1=abcdef..."
  const parts = header.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
  const kv: Record<string, string> = {};
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k || !v) continue;
    kv[k] = v;
  }
  if (!kv.ts || !kv.v1) return null;
  return { ts: kv.ts, v1: kv.v1 };
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function parseWebhookTsMs(ts: string): number | null {
  const n = Number(ts);
  if (!Number.isFinite(n)) return null;
  // Some integrations send seconds; newer ones send ms.
  return n < 10_000_000_000 ? n * 1000 : n;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Optional hardening: require a shared token in the webhook URL.
    // This is useful because webhooks must be public (verify_jwt=false).
    const mpWebhookToken = String(Deno.env.get('MERCADOPAGO_WEBHOOK_TOKEN') || '').trim();
    if (mpWebhookToken) {
      const url = new URL(req.url);
      const provided = String(url.searchParams.get('token') || '').trim();
      if (!provided || provided !== mpWebhookToken) {
        return new Response(JSON.stringify({ error: 'Unauthorized webhook' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Read body once (needed both for signature validation fallback and payload parsing)
    const rawBody = await req.text();

    // Parse webhook payload (JSON)
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional hardening: verify MercadoPago webhook signature if secret is configured.
    // Recommended for production when verify_jwt=false (webhooks are unauthenticated at the platform level).
    const url = new URL(req.url);
    const mpWebhookToken = Deno.env.get('MERCADOPAGO_WEBHOOK_TOKEN');
    const mpWebhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');

    if (mpWebhookToken) {
      const tokenParam = url.searchParams.get('token') || '';
      if (!tokenParam || !timingSafeEqualString(tokenParam, mpWebhookToken)) {
        return new Response(JSON.stringify({ error: 'Invalid webhook token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (mpWebhookSecret) {
      const signatureHeader = req.headers.get('x-signature') || req.headers.get('X-Signature');
      const requestIdHeader = req.headers.get('x-request-id') || req.headers.get('X-Request-Id');
      if (!signatureHeader || !requestIdHeader) {
        return new Response(JSON.stringify({ error: 'Missing webhook signature headers' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sig = parseMpSignature(signatureHeader);
      if (!sig) {
        return new Response(JSON.stringify({ error: 'Invalid x-signature format' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Basic replay protection (5 minutes)
      const tsMs = parseWebhookTsMs(sig.ts);
      if (!tsMs || Math.abs(Date.now() - tsMs) > 60 * 5 * 1000) {
        return new Response(JSON.stringify({ error: 'Webhook timestamp out of range' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // MP uses query params for signature: typically "data.id" (new) or "id" (legacy).
      const dataIdUrlRaw = url.searchParams.get('data.id') || url.searchParams.get('id') || '';
      const fallbackId = (payload as any)?.data?.id ? String((payload as any).data.id) : '';
      const dataIdUrl = (dataIdUrlRaw || fallbackId).toLowerCase();

      if (!dataIdUrl) {
        return new Response(JSON.stringify({ error: 'Missing data.id for signature validation' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // MercadoPago signature template:
      // id:<data.id_url>;request-id:<x-request-id>;ts:<ts>;
      const template = `id:${dataIdUrl};request-id:${requestIdHeader};ts:${sig.ts};`;
      const expected = await hmacSha256Hex(mpWebhookSecret, template);
      if (!timingSafeEqualHex(expected, sig.v1)) {
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (!mpWebhookToken) {
      // Dev-only escape hatch: keep accepting webhooks without auth when no secret/token is configured.
      // Production should always set at least MERCADOPAGO_WEBHOOK_TOKEN or MERCADOPAGO_WEBHOOK_SECRET.
      console.warn('Warning: MERCADOPAGO_WEBHOOK_SECRET/TOKEN not configured; accepting unsigned webhook request.');
    }

    // Get MercadoPago access token
    const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mercadopagoAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Received webhook:', JSON.stringify(payload));

    // ============================================================================
    // PAYMENTS (one-time preference)
    // ============================================================================
    if (payload.type === 'payment') {
      // Get payment details from MercadoPago
      const paymentId = payload.data.id;

      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${mercadopagoAccessToken}`,
          },
        }
      );

      if (!paymentResponse.ok) {
        throw new Error(`Failed to fetch payment details: ${paymentResponse.status}`);
      }

      const payment: PaymentData = await paymentResponse.json();

      console.log('Payment details:', JSON.stringify(payment));

    // ============================================================================
    // IDEMPOTENCY CHECK: Prevent duplicate webhook processing (keyed by external_reference)
    // ============================================================================
    const externalRef = payment.external_reference || '';
    if (!externalRef) {
      return new Response(JSON.stringify({ error: 'Missing external_reference' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingTx } = await supabase
      .from('payment_transactions')
      .select('id, status')
      .eq('provider', 'mercadopago')
      .eq('provider_transaction_id', String(externalRef))
      .maybeSingle();

    if (existingTx && existingTx.status !== 'pending') {
      console.log(`Payment ${paymentId} already processed with status: ${existingTx.status}. Skipping.`);
      return new Response(JSON.stringify({
        success: true,
        message: 'Payment already processed (idempotency check)',
        status: existingTx.status,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // ============================================================================

    // Extract metadata
    const externalParts = externalRef.split('_');
    const externalUserId = externalParts[0] || null;
    const externalTier = (externalParts[1] as 'pro' | 'premium' | 'free' | undefined) || undefined;

    const userId = payment.metadata?.user_id || externalUserId;
    const subscriptionTier = payment.metadata?.subscription_tier || (externalTier === 'pro' || externalTier === 'premium' ? externalTier : undefined);
    const currency = payment.metadata?.currency || payment.currency_id;

    if (!userId || !subscriptionTier) {
      console.error('Missing required metadata:', { userId, subscriptionTier });
      return new Response(JSON.stringify({ error: 'Missing required metadata' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate amount/currency match expected plan to prevent tampering.
    const expectedCurrency = currency === 'USD' ? 'USD' : 'ARS';
    const expectedAmount = expectedCurrency === 'USD'
      ? PRICES[subscriptionTier].usd
      : PRICES[subscriptionTier].ars;
    if (expectedCurrency !== String(payment.currency_id)) {
      console.error('Currency mismatch:', { expectedCurrency, got: payment.currency_id, externalRef });
      return new Response(JSON.stringify({ error: 'Currency mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (Number(payment.transaction_amount) !== Number(expectedAmount)) {
      console.error('Amount mismatch:', { expectedAmount, got: payment.transaction_amount, externalRef });
      return new Response(JSON.stringify({ error: 'Amount mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map MercadoPago status to our status
    let transactionStatus: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled';
    switch (payment.status) {
      case 'approved':
        transactionStatus = 'approved';
        break;
      case 'rejected':
      case 'cancelled':
        transactionStatus = 'rejected';
        break;
      case 'refunded':
        transactionStatus = 'refunded';
        break;
      default:
        transactionStatus = 'pending';
    }

    // Update payment transaction in database (keyed by external_reference).
    const txUpdate = {
      status: transactionStatus,
      provider_payment_method_id: payment.payment_method_id,
      metadata: {
        ...(payment.metadata || {}),
        status_detail: payment.status_detail,
        date_approved: payment.date_approved,
        mp_payment_id: payment.id,
        external_reference: externalRef,
      },
    };

    const { data: updatedTx, error: txUpdateError } = await supabase
      .from('payment_transactions')
      .update(txUpdate)
      .eq('provider', 'mercadopago')
      .eq('provider_transaction_id', String(externalRef))
      .select('id')
      .maybeSingle();

    if (txUpdateError) {
      // If row doesn't exist (unexpected), create it so idempotency works.
      const { error: txInsertError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: userId,
          amount: payment.transaction_amount,
          currency: (payment.currency_id === 'USD' ? 'USD' : 'ARS'),
          status: transactionStatus,
          provider: 'mercadopago',
          provider_transaction_id: String(externalRef),
          provider_payment_method_id: payment.payment_method_id,
          description: `Suscripción ${subscriptionTier}`,
          metadata: txUpdate.metadata,
        });
      if (txInsertError) {
        console.error('Error inserting transaction:', txInsertError);
      }
    } else if (!updatedTx) {
      console.warn('Transaction row not found to update:', { externalRef });
    }

    // If payment approved, update subscription
    if (payment.status === 'approved') {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Check if user has an active subscription
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingSubscription) {
        // Update existing subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            tier: subscriptionTier,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            // Keep within allowed enum/check constraint. Store raw mp method in tx metadata.
            payment_method: 'mercadopago_credit_card',
            cancel_at_period_end: false,
            canceled_at: null,
          })
          .eq('user_id', userId);

        if (subError) {
          console.error('Error updating subscription:', subError);
          throw subError;
        }
      } else {
        // Create new subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            tier: subscriptionTier,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            payment_method: 'mercadopago_credit_card',
            ai_generations_used: 0,
          });

        if (subError) {
          console.error('Error creating subscription:', subError);
          throw subError;
        }
      }

      // Update or create usage metrics
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEndMetrics = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const aiGenerationsLimit = subscriptionTier === 'premium'
        ? LIMITS_BY_TIER.premium
        : (subscriptionTier === 'pro' ? LIMITS_BY_TIER.pro : LIMITS_BY_TIER.free);

      const { error: metricsError } = await supabase
        .from('usage_metrics')
        .upsert({
          user_id: userId,
          subscription_tier: subscriptionTier,
          ai_generations_used: 0,
          ai_generations_limit: aiGenerationsLimit,
          period_start: periodStart.toISOString(),
          period_end: periodEndMetrics.toISOString(),
          last_reset: now.toISOString(),
        }, {
          onConflict: 'user_id,period_start',
        });

      if (metricsError) {
        console.error('Error updating usage metrics:', metricsError);
      }

      console.log(`Successfully activated ${subscriptionTier} subscription for user ${userId}`);
    }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================================================
    // SUBSCRIPTIONS (preapproval / Suscripciones)
    // ============================================================================
    if (payload.type === 'subscription_preapproval' || payload.type === 'preapproval') {
      const preapprovalId = payload.data.id;

      const preapprovalResp = await fetch(
        `https://api.mercadopago.com/preapproval/${preapprovalId}`,
        {
          headers: {
            'Authorization': `Bearer ${mercadopagoAccessToken}`,
          },
        }
      );

      if (!preapprovalResp.ok) {
        throw new Error(`Failed to fetch preapproval details: ${preapprovalResp.status}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const preapproval: any = await preapprovalResp.json();
      const externalRef = String(preapproval?.external_reference || '');
      const status = String(preapproval?.status || '');
      const nextPaymentDate = preapproval?.next_payment_date ? String(preapproval.next_payment_date) : null;
      const recurringCurrency = String(preapproval?.auto_recurring?.currency_id || 'ARS');
      const recurringAmount = Number(preapproval?.auto_recurring?.transaction_amount || 0);

      if (!externalRef) {
        return new Response(JSON.stringify({ error: 'Missing external_reference on preapproval' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const parts = externalRef.split('_');
      const userId = parts[0] || null;
      const tier = (parts[1] as 'pro' | 'premium' | undefined) || undefined;
      if (!userId || (tier !== 'pro' && tier !== 'premium')) {
        return new Response(JSON.stringify({ error: 'Invalid external_reference format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate recurring amount/currency against expected plan.
      if (recurringCurrency !== 'ARS') {
        console.error('Preapproval currency mismatch:', { expected: 'ARS', got: recurringCurrency, externalRef, preapprovalId });
        return new Response(JSON.stringify({ error: 'Currency mismatch' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (Number(recurringAmount) !== Number(PRICES[tier].ars)) {
        console.error('Preapproval amount mismatch:', { expected: PRICES[tier].ars, got: recurringAmount, externalRef, preapprovalId });
        return new Response(JSON.stringify({ error: 'Amount mismatch' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Idempotency check: keyed by external_reference.
      const { data: existingTx } = await supabase
        .from('payment_transactions')
        .select('id, status')
        .eq('provider', 'mercadopago')
        .eq('provider_transaction_id', String(externalRef))
        .maybeSingle();

      if (existingTx && existingTx.status !== 'pending' && status === 'authorized') {
        console.log(`Preapproval ${preapprovalId} already processed with status: ${existingTx.status}. Skipping.`);
        return new Response(JSON.stringify({ ok: true, idempotent: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const txStatus =
        status === 'authorized' ? 'approved'
          : status === 'cancelled' ? 'cancelled'
            : status === 'paused' ? 'pending'
              : 'pending';

      // Update or insert transaction row.
      const txUpdate = {
        status: txStatus,
        metadata: {
          external_reference: externalRef,
          preapproval_id: preapprovalId,
          preapproval_status: status,
          next_payment_date: nextPaymentDate,
        },
      };

      const { data: updatedTx, error: txUpdateError } = await supabase
        .from('payment_transactions')
        .update(txUpdate)
        .eq('provider', 'mercadopago')
        .eq('provider_transaction_id', String(externalRef))
        .select('id')
        .maybeSingle();

      if (txUpdateError || !updatedTx) {
        const { error: txInsertError } = await supabase
          .from('payment_transactions')
          .insert({
            user_id: userId,
            amount: PRICES[tier].ars,
            currency: 'ARS',
            status: txStatus,
            provider: 'mercadopago',
            provider_transaction_id: String(externalRef),
            description: `Suscripción ${tier} (MercadoPago)`,
            metadata: txUpdate.metadata,
          });
        if (txInsertError) console.error('Error inserting preapproval transaction:', txInsertError);
      }

      if (status === 'authorized') {
        const now = new Date();
        const periodEnd = nextPaymentDate ? new Date(nextPaymentDate) : new Date(now);
        if (!nextPaymentDate) periodEnd.setMonth(periodEnd.getMonth() + 1);

        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            tier,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            payment_method: 'mercadopago_credit_card',
            mercadopago_subscription_id: String(preapprovalId),
            cancel_at_period_end: false,
            canceled_at: null,
          });

        if (subError) {
          console.error('Error updating subscription from preapproval:', subError);
          throw subError;
        }

        // Update usage metrics (monthly record).
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEndMetrics = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const { error: metricsError } = await supabase
          .from('usage_metrics')
          .upsert({
            user_id: userId,
            subscription_tier: tier,
            ai_generations_used: 0,
            ai_generations_limit: LIMITS_BY_TIER[tier],
            period_start: periodStart.toISOString(),
            period_end: periodEndMetrics.toISOString(),
            last_reset: now.toISOString(),
          }, {
            onConflict: 'user_id,period_start',
          });

        if (metricsError) {
          console.error('Error updating usage metrics from preapproval:', metricsError);
        }
      }

      if (status === 'cancelled') {
        const now = new Date();
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: true,
            canceled_at: now.toISOString(),
          })
          .eq('user_id', userId);
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.type === 'subscription_authorized_payment') {
      const authorizedPaymentId = payload.data.id;

      const authPayResp = await fetch(
        `https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${mercadopagoAccessToken}`,
          },
        }
      );

      if (!authPayResp.ok) {
        throw new Error(`Failed to fetch authorized payment details: ${authPayResp.status}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authPay: any = await authPayResp.json();
      const preapprovalId = String(authPay?.preapproval_id || '');
      const status = String(authPay?.status || '');

      if (!preapprovalId) {
        return new Response(JSON.stringify({ ok: true, ignored: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (status === 'approved') {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        // Extend subscription period and reset usage (monthly).
        const { data: subRow } = await supabase
          .from('subscriptions')
          .select('user_id, tier')
          .eq('mercadopago_subscription_id', preapprovalId)
          .maybeSingle();

        if (subRow?.user_id && (subRow.tier === 'pro' || subRow.tier === 'premium')) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              cancel_at_period_end: false,
              canceled_at: null,
            })
            .eq('mercadopago_subscription_id', preapprovalId);

          const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const periodEndMetrics = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          await supabase
            .from('usage_metrics')
            .upsert({
              user_id: subRow.user_id,
              subscription_tier: subRow.tier,
              ai_generations_used: 0,
              ai_generations_limit: LIMITS_BY_TIER[subRow.tier],
              period_start: periodStart.toISOString(),
              period_end: periodEndMetrics.toISOString(),
              last_reset: now.toISOString(),
            }, {
              onConflict: 'user_id,period_start',
            });
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Event type not handled' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
