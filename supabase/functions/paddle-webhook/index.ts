// Supabase Edge Function: Paddle webhook handler
// Verifies signature and updates subscriptions + payment_transactions.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, paddle-signature',
};

type Tier = 'pro' | 'premium';

const LIMITS_BY_TIER: Record<'free' | 'pro' | 'premium', number> = {
  free: 200,
  pro: 300,
  premium: 400,
};

const PLANS_USD: Record<Tier, number> = {
  pro: 9.99,
  premium: 16.99,
};

function parsePaddleSignature(header: string): { ts: string; h1: string } | null {
  // Format: "ts=...;h1=..."
  const parts = header.split(';').map((p) => p.trim()).filter(Boolean);
  const kv: Record<string, string> = {};
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    kv[k] = v;
  }
  if (!kv.ts || !kv.h1) return null;
  return { ts: kv.ts, h1: kv.h1 };
}

function timingSafeEqualHex(a: string, b: string): boolean {
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

function normalizeTier(tier: unknown): Tier | null {
  if (tier === 'pro' || tier === 'premium') return tier;
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get('PADDLE_WEBHOOK_SECRET_KEY');
    if (!secret) throw new Error('PADDLE_WEBHOOK_SECRET_KEY not configured');

    const signatureHeader = req.headers.get('Paddle-Signature') || req.headers.get('paddle-signature');
    if (!signatureHeader) {
      return new Response(JSON.stringify({ error: 'Missing Paddle-Signature header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.text();
    const sig = parsePaddleSignature(signatureHeader);
    if (!sig) {
      return new Response(JSON.stringify({ error: 'Invalid Paddle-Signature format' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic replay protection (5 minutes)
    const nowSec = Math.floor(Date.now() / 1000);
    const tsNum = Number(sig.ts);
    if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > 60 * 5) {
      return new Response(JSON.stringify({ error: 'Webhook timestamp out of range' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expected = await hmacSha256Hex(secret, `${sig.ts}:${rawBody}`);
    if (!timingSafeEqualHex(expected, sig.h1)) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const event = JSON.parse(rawBody);
    const eventType = String(event?.event_type || '');
    const data = event?.data || {};

    console.log('Paddle webhook:', eventType);

    const priceIdPro = Deno.env.get('PADDLE_PRICE_ID_PRO') || '';
    const priceIdPremium = Deno.env.get('PADDLE_PRICE_ID_PREMIUM') || '';

    const upsertUsage = async (userId: string, tier: 'free' | 'pro' | 'premium') => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { error } = await supabase
        .from('usage_metrics')
        .upsert({
          user_id: userId,
          subscription_tier: tier,
          ai_generations_used: 0,
          ai_generations_limit: LIMITS_BY_TIER[tier],
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          last_reset: now.toISOString(),
        }, { onConflict: 'user_id,period_start' });

      if (error) console.error('usage_metrics upsert error:', error);
    };

    if (eventType === 'transaction.completed') {
      const transactionId = String(data?.id || '');
      const customUserId = String(data?.custom_data?.user_id || '');
      const customTier = normalizeTier(data?.custom_data?.tier);
      const subscriptionId = data?.subscription_id ? String(data.subscription_id) : null;

      if (!transactionId || !customUserId || !customTier) {
        console.error('Missing transaction fields:', { transactionId, customUserId, customTier });
        return new Response(JSON.stringify({ ok: true, ignored: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate expected price id for tier is present in items to prevent tampering.
      const expectedPriceId = customTier === 'pro' ? priceIdPro : priceIdPremium;
      const items: any[] = Array.isArray(data?.items) ? data.items : [];
      const matched = items.some((it) => String(it?.price?.id || it?.price_id || '') === expectedPriceId);
      if (!expectedPriceId || !matched) {
        console.error('Price id mismatch:', { customTier, expectedPriceId, items: items.map((it) => it?.price?.id || it?.price_id) });
        return new Response(JSON.stringify({ error: 'Price id mismatch' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Upsert transaction row
      const { error: txError } = await supabase
        .from('payment_transactions')
        .upsert({
          user_id: customUserId,
          // Store the plan base price (taxes/FX may vary; entitlements are tied to tier/price_id).
          amount: PLANS_USD[customTier],
          currency: 'USD',
          status: 'approved',
          provider: 'paddle',
          provider_transaction_id: transactionId,
          description: `Suscripción ${customTier} (Paddle)`,
          metadata: {
            event_type: eventType,
            subscription_id: subscriptionId,
            items: items.map((it) => ({ price_id: it?.price?.id || it?.price_id, quantity: it?.quantity })),
          },
        }, { onConflict: 'provider,provider_transaction_id' });

      if (txError) console.error('payment_transactions upsert error:', txError);

      // Update subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: customUserId,
          tier: customTier,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          canceled_at: null,
          payment_method: 'paddle_card',
          paddle_subscription_id: subscriptionId,
          updated_at: now.toISOString(),
        });

      if (subError) console.error('subscriptions upsert error:', subError);

      await upsertUsage(customUserId, customTier);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (eventType.startsWith('subscription.')) {
      const subscriptionId = String(data?.id || '');
      const customUserId = String(data?.custom_data?.user_id || '');
      const customTier = normalizeTier(data?.custom_data?.tier);

      let userId = customUserId || null;
      let tier: Tier | null = customTier;

      if (!userId && subscriptionId) {
        const { data: subRow } = await supabase
          .from('subscriptions')
          .select('user_id, tier')
          .eq('paddle_subscription_id', subscriptionId)
          .maybeSingle();
        if (subRow?.user_id) userId = String(subRow.user_id);
        if (!tier && (subRow?.tier === 'pro' || subRow?.tier === 'premium')) tier = subRow.tier;
      }

      if (!userId) {
        console.warn('subscription event without user mapping:', { eventType, subscriptionId });
        return new Response(JSON.stringify({ ok: true, ignored: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const update: Record<string, unknown> = {
        paddle_subscription_id: subscriptionId || null,
        payment_method: 'paddle_card',
        updated_at: new Date().toISOString(),
      };

      if (eventType === 'subscription.canceled') {
        update.status = 'canceled';
        update.cancel_at_period_end = true;
        update.canceled_at = new Date().toISOString();
      } else if (eventType === 'subscription.paused') {
        update.status = 'paused';
      } else if (eventType === 'subscription.past_due') {
        update.status = 'past_due';
      } else if (eventType === 'subscription.activated' || eventType === 'subscription.resumed' || eventType === 'subscription.updated') {
        update.status = 'active';
        update.cancel_at_period_end = false;
        update.canceled_at = null;
      }

      // Best-effort: set current billing period from Paddle payload if present
      const startsAt = data?.current_billing_period?.starts_at;
      const endsAt = data?.current_billing_period?.ends_at;
      if (startsAt) update.current_period_start = String(startsAt);
      if (endsAt) update.current_period_end = String(endsAt);
      if (tier) update.tier = tier;

      const { error } = await supabase
        .from('subscriptions')
        .update(update)
        .eq('user_id', userId);

      if (error) console.error('subscriptions update error:', error);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ignore other events for now
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Paddle webhook error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
