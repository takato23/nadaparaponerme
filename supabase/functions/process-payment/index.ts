// Supabase Edge Function: Process Payment
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

const PLANS: Record<'pro' | 'premium', { amount_ars: number; amount_usd: number }> = {
    pro: { amount_ars: 2999, amount_usd: 9.99 },
    premium: { amount_ars: 4999, amount_usd: 16.99 },
};

const LIMITS_BY_TIER: Record<'free' | 'pro' | 'premium', number> = {
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

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase credentials');
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Service role + user JWT header lets us validate caller identity.
        const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Admin client for DB writes (bypass RLS).
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { payment_id, user_id } = await req.json();

        if (!payment_id || !user_id) {
            return new Response(
                JSON.stringify({ error: 'Missing required parameters' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Caller must be the same user. (Admins/service-role calls are not supported here.)
        if (user.id !== user_id) {
            return new Response(
                JSON.stringify({ error: 'Forbidden' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify payment with MercadoPago API
        const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
        if (!mpAccessToken) {
            throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
        }

        const paymentResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/${payment_id}`,
            {
                headers: {
                    'Authorization': `Bearer ${mpAccessToken}`,
                },
            }
        );

        if (!paymentResponse.ok) {
            const errorText = await paymentResponse.text();
            console.error('MercadoPago API error:', errorText);
            return new Response(
                JSON.stringify({ error: 'No se pudo verificar el pago con MercadoPago' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const paymentData = await paymentResponse.json();
        console.log('Payment verification:', JSON.stringify({
            id: paymentData.id,
            status: paymentData.status,
            status_detail: paymentData.status_detail,
            metadata: paymentData.metadata
        }));

        // Only process approved payments
        if (paymentData.status !== 'approved') {
            return new Response(
                JSON.stringify({
                    error: 'El pago no fue aprobado',
                    payment_status: paymentData.status,
                    status_detail: paymentData.status_detail
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify metadata matches request (security check)
        const externalRef: string = paymentData.external_reference || '';
        const externalParts = externalRef.split('_');
        const externalUserId = externalParts[0] || null;
        const externalTier = externalParts[1] as 'pro' | 'premium' | 'free' | undefined;

        const metadataUserId = paymentData.metadata?.user_id || externalUserId;
        if (metadataUserId && metadataUserId !== user_id) {
            console.error('User ID mismatch:', { request: user_id, payment: metadataUserId });
            return new Response(
                JSON.stringify({ error: 'Error de seguridad: usuario no coincide' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const paymentTier = paymentData.metadata?.subscription_tier || (externalTier === 'pro' || externalTier === 'premium' ? externalTier : null);
        if (!paymentTier) {
            return new Response(
                JSON.stringify({ error: 'Missing subscription tier in payment metadata' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const paymentCurrency = String(paymentData.metadata?.currency || paymentData.currency_id || 'ARS');
        const expectedAmount = paymentCurrency === 'USD' ? PLANS[paymentTier].amount_usd : PLANS[paymentTier].amount_ars;
        if (Number(paymentData.transaction_amount) !== Number(expectedAmount)) {
            console.error('Amount mismatch:', {
                expected: expectedAmount,
                got: paymentData.transaction_amount,
                paymentTier,
                paymentCurrency,
                externalRef,
            });
            return new Response(
                JSON.stringify({ error: 'Amount mismatch' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Calculate period dates
        const now = new Date();
        const oneMonthLater = new Date(now);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

        // Update user subscription
        const { error } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
                user_id,
                tier: paymentTier,
                status: 'active',
                current_period_start: now.toISOString(),
                current_period_end: oneMonthLater.toISOString(),
                updated_at: now.toISOString(),
                payment_method: 'mercadopago_credit_card',
            });

        if (error) throw error;

        // Reset usage metrics for the current month (one record per user per period).
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEndMetrics = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const { error: metricsError } = await supabaseAdmin
            .from('usage_metrics')
            .upsert({
                user_id,
                subscription_tier: paymentTier,
                ai_generations_used: 0,
                ai_generations_limit: LIMITS_BY_TIER[paymentTier],
                period_start: periodStart.toISOString(),
                period_end: periodEndMetrics.toISOString(),
                last_reset: now.toISOString(),
            }, {
                onConflict: 'user_id,period_start',
            });

        if (metricsError) throw metricsError;

        // Update payment transaction status
        const { error: txError } = await supabaseAdmin
            .from('payment_transactions')
            .update({
                status: 'approved',
                provider_payment_method_id: paymentData.payment_method_id || null,
                metadata: {
                    status_detail: paymentData.status_detail,
                    date_approved: paymentData.date_approved,
                    payment_method_id: paymentData.payment_method_id,
                    processed_via: 'process-payment',
                    mp_payment_id: paymentData.id,
                    external_reference: externalRef,
                },
            })
            .eq('provider', 'mercadopago')
            .eq('provider_transaction_id', String(externalRef));

        if (txError) {
            console.error('Error updating transaction (non-blocking):', txError);
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Subscription updated successfully' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error processing payment:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
