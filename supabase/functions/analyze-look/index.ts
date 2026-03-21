import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, Type } from 'npm:@google/genai@1.27.0';
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import { enforceAIBudgetGuard, getBudgetLimitMessage, recordAIBudgetSuccess } from '../_shared/aiBudgetGuard.ts';
import { withRetry } from '../_shared/retry.ts';
import { parsePositiveIntEnv } from '../_shared/security.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

const ANALYZE_LOOK_RATE_LIMIT_PER_MIN = parsePositiveIntEnv('RATE_LIMIT_ANALYZE_LOOK_PER_MIN', 24, 1, 240);
const ANALYZE_LOOK_RATE_LIMIT_WINDOW_SECONDS = parsePositiveIntEnv('RATE_LIMIT_ANALYZE_LOOK_WINDOW_SECONDS', 60, 10, 3600);

const lookAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    looks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          occasion: { type: Type.STRING },
          style_tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          palette: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          dominant_pieces: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          confidence: { type: Type.NUMBER },
        },
        required: ['summary', 'style_tags', 'palette', 'dominant_pieces', 'confidence'],
      },
    },
    cross_suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    adaptation_tip: { type: Type.STRING },
  },
  required: ['looks', 'cross_suggestions'],
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

    const rateLimit = await enforceRateLimit(supabase, user.id, 'analyze-look', {
      maxRequests: ANALYZE_LOOK_RATE_LIMIT_PER_MIN,
      windowSeconds: ANALYZE_LOOK_RATE_LIMIT_WINDOW_SECONDS,
    });
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Demasiadas solicitudes en poco tiempo. Esperá un momento y reintentá.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageDataUrls } = await req.json();
    if (!Array.isArray(imageDataUrls) || imageDataUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing imageDataUrls' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const limitedImages = imageDataUrls.slice(0, 3);
    const budgetGuard = await enforceAIBudgetGuard(supabase, user.id, 'analyze-look', 1);
    if (!budgetGuard.allowed) {
      return new Response(JSON.stringify({ error: getBudgetLimitMessage(budgetGuard.reason) }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const parts = limitedImages.map((imageDataUrl: string) => {
      const [mimeTypePart, base64Data] = imageDataUrl.split(';base64,');
      const mimeType = mimeTypePart?.split(':')[1];

      if (!base64Data || !mimeType) {
        throw new Error('Invalid image data URL format');
      }

      return {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      };
    });

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: {
          parts: [
            ...parts,
            {
              text: 'Analizá estas fotos de looks completos de una misma persona. Para cada foto devolvé: summary útil y breve, ocasión probable, style_tags, palette, dominant_pieces y confidence. Además devolvé 2 o 3 cross_suggestions entre looks y una adaptación contextual corta. No prometas identificar exactamente la misma prenda entre fotos.',
            },
          ],
        },
        config: {
          systemInstruction: 'Sos un stylist argentino. Devolvés valor rápido para onboarding: describís estilo, ocasión, piezas visibles y combinaciones entre looks sin vender humo.',
          responseMimeType: 'application/json',
          responseSchema: lookAnalysisSchema,
        },
      })
    );

    const parsed = JSON.parse(response.text || '{}');

    await recordAIBudgetSuccess(supabase, user.id, 'analyze-look', 1);
    await recordRequestResult(supabase, user.id, 'analyze-look', true);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('analyze-look error:', error);
    if (supabase && userId) {
      await recordRequestResult(supabase, userId, 'analyze-look', false);
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
