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
        const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY');

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

        // TODO: Verify payment with MercadoPago API using payment_id
        // const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
        // ... verification logic ...

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
        let limits = { ai_generations_per_month: 10 }; // Default Free
        if (subscription_tier === 'pro') limits.ai_generations_per_month = 100;
        if (subscription_tier === 'premium') limits.ai_generations_per_month = -1;

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
