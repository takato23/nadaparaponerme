// Supabase Edge Function: Analyze Clothing Item with Gemini AI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, Type } from 'npm:@google/genai@1.27.0';
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import { enforceAIBudgetGuard, getBudgetLimitMessage, recordAIBudgetSuccess } from '../_shared/aiBudgetGuard.ts';
import { withRetry } from '../_shared/retry.ts';

const MONTH_SECONDS = 60 * 60 * 24 * 30;
const getMonthlyLimit = (envName: string, fallback: number) => {
  const raw = Deno.env.get(envName);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabase: any = null;
  let userId: string | null = null;

  try {
    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

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

    const monthlyLimit = getMonthlyLimit('BETA_MONTHLY_SCAN_LIMIT', 400);
    if (monthlyLimit > 0) {
      const monthlyCap = await enforceRateLimit(supabase, user.id, 'beta-scan-monthly', {
        windowSeconds: MONTH_SECONDS,
        maxRequests: monthlyLimit,
      });
      if (!monthlyCap.allowed) {
        return new Response(
          JSON.stringify({ error: 'Límite mensual de escaneos alcanzado. Probá de nuevo el próximo mes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const rateLimit = await enforceRateLimit(supabase, user.id, 'analyze-clothing');
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

    // Parse request body (expecting JSON with imageDataUrl)
    const { imageDataUrl } = await req.json();

    if (!imageDataUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing imageDataUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic payload guard (~6MB string upper bound)
    if (typeof imageDataUrl === 'string' && imageDataUrl.length > 6_000_000) {
      return new Response(
        JSON.stringify({ error: 'Image too large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const creditCost = 1;
    const budgetGuard = await enforceAIBudgetGuard(supabase, user.id, 'analyze-clothing', creditCost);
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

    const { data: canUseCredits, error: canUseCreditsError } = await supabase.rpc('can_user_generate_outfit', {
      p_user_id: user.id,
      p_amount: creditCost,
    });
    if (canUseCreditsError) {
      console.error('Error checking credits for analyze-clothing:', canUseCreditsError);
      return new Response(
        JSON.stringify({ error: 'No se pudo validar la cuota. Intentá de nuevo.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!canUseCredits) {
      return new Response(
        JSON.stringify({ error: 'No tenés créditos suficientes. Upgradeá tu plan para continuar.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract base64 and mime type from data URL
    const [mimeTypePart, base64Data] = imageDataUrl.split(';base64,');
    const mimeType = mimeTypePart.split(':')[1];

    if (!base64Data || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'Invalid image data URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const base64 = base64Data;

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // Schema for clothing analysis
    const clothingItemSchema = {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: 'ej: "top", "bottom", "shoes", "accessory", "outerwear", "one-piece"',
        },
        subcategory: {
          type: Type.STRING,
          description: 'ej: "graphic tee", "cargo pants", "sneakers", "t-shirt", "jeans", "dress", "jacket"',
        },
        color_primary: {
          type: Type.STRING,
          description: 'el color principal dominante',
        },
        neckline: {
          type: Type.STRING,
          description: 'Opcional. Tipo de cuello si aplica. ej: "cuello redondo", "cuello en V", "cuello alto", "strapless"',
        },
        sleeve_type: {
          type: Type.STRING,
          description: 'Opcional. Tipo de manga si aplica. ej: "manga corta", "manga larga", "sin mangas", "tirantes"',
        },
        vibe_tags: {
          type: Type.ARRAY,
          description: 'ej: "streetwear", "casual", "sporty", "elegant", "boho", "minimalist"',
          items: {
            type: Type.STRING,
          },
        },
        seasons: {
          type: Type.ARRAY,
          description: 'array de: "spring", "summer", "autumn", "winter"',
          items: {
            type: Type.STRING,
          },
        },
      },
      required: ['category', 'subcategory', 'color_primary', 'vibe_tags', 'seasons'],
    };

    // Analyze image with Gemini
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64,
                mimeType,
              },
            },
          ],
        },
        config: {
          systemInstruction:
            'Eres un experto en moda. Analiza la prenda en la imagen y describe sus características, prestando especial atención a detalles como el tipo de cuello y de manga si son visibles.',
          responseMimeType: 'application/json',
          responseSchema: clothingItemSchema,
        },
      })
    );

    const analysis = JSON.parse(response.text || '{}');

    // Return the analysis directly (client expects ClothingItemMetadata format)
    const { data: incremented, error: incrementError } = await supabase.rpc('increment_ai_generation_usage', {
      p_user_id: user.id,
      p_amount: creditCost,
    });
    if (incrementError) {
      console.error('Error incrementing analyze-clothing credits:', incrementError);
    }
    await recordAIBudgetSuccess(supabase, user.id, 'analyze-clothing', incremented ? creditCost : 0);

    await recordRequestResult(supabase, user.id, 'analyze-clothing', true);

    return new Response(
      JSON.stringify({
        ...analysis,
        credits_used: incremented ? creditCost : 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error analyzing clothing:', error);
    if (supabase && userId) {
      await recordRequestResult(supabase, userId, 'analyze-clothing', false);
    }
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to analyze clothing item',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
