// Supabase Edge Function: Process Payment
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
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

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { payment_id, user_id, subscription_tier } = await req.json();

        if (!payment_id || !user_id || !subscription_tier) {
            return new Response(
                JSON.stringify({ error: 'Missing required parameters' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        const metadataUserId = paymentData.metadata?.user_id || paymentData.external_reference?.split('_')[0];
        if (metadataUserId && metadataUserId !== user_id) {
            console.error('User ID mismatch:', { request: user_id, payment: metadataUserId });
            return new Response(
                JSON.stringify({ error: 'Error de seguridad: usuario no coincide' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Calculate period dates
        const now = new Date();
        const oneMonthLater = new Date(now);
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

        // Update user subscription
        const { error } = await supabase
            .from('subscriptions')
            .upsert({
                user_id,
                tier: subscription_tier,
                status: 'active',
                current_period_start: now.toISOString(),
                current_period_end: oneMonthLater.toISOString(),
                updated_at: now.toISOString(),
            });

        if (error) throw error;

        // Reset usage metrics for the new period
        // Get plan limits (simplified for this function, ideally fetch from DB or config)
        const limits = { ai_generations_per_month: 10 }; // Default Free
        if (subscription_tier === 'pro') limits.ai_generations_per_month = 150;
        if (subscription_tier === 'premium') limits.ai_generations_per_month = 400;

        const { error: metricsError } = await supabase
            .from('usage_metrics')
            .upsert({
                user_id,
                subscription_tier,
                ai_generations_used: 0,
                ai_generations_limit: limits.ai_generations_per_month,
                period_start: now.toISOString(),
                period_end: oneMonthLater.toISOString(),
                last_reset: now.toISOString(),
            });

        if (metricsError) throw metricsError;

        // Update payment transaction status
        const { error: txError } = await supabase
            .from('payment_transactions')
            .update({
                status: 'approved',
                metadata: {
                    status_detail: paymentData.status_detail,
                    date_approved: paymentData.date_approved,
                    payment_method_id: paymentData.payment_method_id,
                    processed_via: 'process-payment',
                },
            })
            .eq('provider_transaction_id', String(payment_id));

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
