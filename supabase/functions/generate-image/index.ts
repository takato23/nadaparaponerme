// Supabase Edge Function: Generate Image (Imagen)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'npm:@google/genai@1.27.0';
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import { enforceAIBudgetGuard, getBudgetLimitMessage, recordAIBudgetSuccess } from '../_shared/aiBudgetGuard.ts';
import { withRetry } from '../_shared/retry.ts';
import { isFailClosedHighCostEnabled } from '../_shared/security.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};
const BUDGET_CREDIT_COST = 2;

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let supabase: any = null;
    let userId: string | null = null;

    try {
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiApiKey) {
            throw new Error('Missing GEMINI_API_KEY');
        }

        // Auth required (prevents public abuse)
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

        supabase = createClient(supabaseUrl, supabaseServiceKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        userId = user.id;

        // Optional closed beta allowlist (protects Google credits)
        const allowlistRaw = Deno.env.get('BETA_ALLOWLIST_EMAILS');
        if (allowlistRaw) {
            const email = (user.email || '').toLowerCase().trim();
            const allowed = allowlistRaw
                .split(',')
                .map((e) => e.toLowerCase().trim())
                .filter(Boolean);
            if (!email || !allowed.includes(email)) {
                return new Response(
                    JSON.stringify({ error: 'Beta cerrada: tu cuenta no está habilitada todavía.' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        const rateLimit = await enforceRateLimit(supabase, user.id, 'generate-image');
        if (rateLimit.guardError && isFailClosedHighCostEnabled()) {
            return new Response(
                JSON.stringify({ error: 'Security guard unavailable. Try again shortly.' }),
                { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        if (!rateLimit.allowed) {
            const retryAfter = rateLimit.retryAfterSeconds || 60;
            const message = rateLimit.reason === 'blocked'
                ? 'Detectamos muchos errores seguidos. Espera unos minutos antes de intentar de nuevo.'
                : 'Demasiadas solicitudes en poco tiempo. Espera un momento y reintenta.';
            return new Response(
                JSON.stringify({ error: message }),
                {
                    status: 429,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                        'Retry-After': String(retryAfter),
                    },
                }
            );
        }

        const { prompt } = await req.json();

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: 'Missing prompt' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const budgetGuard = await enforceAIBudgetGuard(supabase, user.id, 'generate-image', BUDGET_CREDIT_COST);
        if (budgetGuard.guardError && isFailClosedHighCostEnabled()) {
            return new Response(
                JSON.stringify({ error: 'Budget guard unavailable. Try again shortly.' }),
                { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        if (!budgetGuard.allowed) {
            return new Response(
                JSON.stringify({ error: getBudgetLimitMessage(budgetGuard.reason) }),
                {
                    status: 429,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                        'Retry-After': String(budgetGuard.retryAfterSeconds || 60),
                    },
                }
            );
        }

        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const enhancedPrompt = `A high-quality studio photograph of ${prompt}, on a clean, neutral white background. The item should be the main focus, with no distractions. Centered composition.`;

        const imageModel = Deno.env.get('GEMINI_IMAGE_MODEL') || 'imagen-4.0-generate-001';
        const response = await withRetry(() =>
            ai.models.generateImages({
                model: imageModel,
                prompt: enhancedPrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '1:1',
                },
            })
        );

        if (response.generatedImages && response.generatedImages.length > 0) {
            const firstImage = response.generatedImages[0];
            const base64ImageBytes = firstImage?.image?.imageBytes;
            if (!base64ImageBytes) {
                throw new Error('No image bytes returned by model');
            }
            const resultImage = `data:image/jpeg;base64,${base64ImageBytes}`;

            await recordAIBudgetSuccess(supabase, user.id, 'generate-image', BUDGET_CREDIT_COST);
            await recordRequestResult(supabase, user.id, 'generate-image', true);

            return new Response(JSON.stringify({ resultImage }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        } else {
            throw new Error("Image generation failed");
        }

    } catch (error) {
        console.error('Error in generate-image:', error);
        if (supabase && userId) {
            await recordRequestResult(supabase, userId, 'generate-image', false);
        }
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
