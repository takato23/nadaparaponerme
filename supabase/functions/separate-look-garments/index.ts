import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'npm:@google/genai@1.27.0';
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import { enforceAIBudgetGuard, getBudgetLimitMessage, recordAIBudgetSuccess } from '../_shared/aiBudgetGuard.ts';
import { withRetry } from '../_shared/retry.ts';
import { extractLookGarmentsWithAI } from '../_shared/lookGarmentExtraction.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabase: any = null;
  let userId: string | null = null;

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error('GEMINI_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    userId = user.id;

    const rateLimit = await enforceRateLimit(supabase, user.id, 'separate-look-garments');
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Demasiadas solicitudes en poco tiempo. Esperá un momento y reintentá.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageDataUrl } = await req.json();
    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing imageDataUrl' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (imageDataUrl.length > 6_000_000) {
      return new Response(JSON.stringify({ error: 'Image too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const budgetGuard = await enforceAIBudgetGuard(supabase, user.id, 'separate-look-garments', 1);
    if (!budgetGuard.allowed) {
      return new Response(JSON.stringify({ error: getBudgetLimitMessage(budgetGuard.reason) }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await withRetry(() =>
      extractLookGarmentsWithAI(ai, imageDataUrl)
    );

    await recordAIBudgetSuccess(supabase, user.id, 'separate-look-garments', 1);
    await recordRequestResult(supabase, user.id, 'separate-look-garments', true);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('separate-look-garments error:', error);
    if (supabase && userId) {
      await recordRequestResult(supabase, userId, 'separate-look-garments', false);
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
