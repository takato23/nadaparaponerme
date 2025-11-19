// Supabase Edge Function: MercadoPago Webhook Handler
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get MercadoPago access token
    const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mercadopagoAccessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const payload: WebhookPayload = await req.json();

    console.log('Received webhook:', JSON.stringify(payload));

    // Only process payment notifications
    if (payload.type !== 'payment') {
      return new Response(JSON.stringify({ message: 'Event type not handled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Extract metadata
    const userId = payment.metadata?.user_id || payment.external_reference?.split('_')[0];
    const subscriptionTier = payment.metadata?.subscription_tier;
    const currency = payment.metadata?.currency || payment.currency_id;

    if (!userId || !subscriptionTier) {
      console.error('Missing required metadata:', { userId, subscriptionTier });
      return new Response(JSON.stringify({ error: 'Missing required metadata' }), {
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

    // Update payment transaction in database
    const { error: txError } = await supabase
      .from('payment_transactions')
      .update({
        status: transactionStatus,
        provider_payment_method_id: payment.payment_method_id,
        metadata: {
          ...payment.metadata,
          status_detail: payment.status_detail,
          date_approved: payment.date_approved,
        },
      })
      .eq('provider_transaction_id', String(payment.id));

    if (txError) {
      console.error('Error updating transaction:', txError);
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
            payment_method: `mercadopago_${payment.payment_method_id}`,
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
            payment_method: `mercadopago_${payment.payment_method_id}`,
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

      const aiGenerationsLimit = subscriptionTier === 'premium' ? -1 : (subscriptionTier === 'pro' ? 100 : 10);

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
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
