// Supabase Edge Function: Generate Outfit with Gemini AI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, Type } from 'npm:@google/genai@1.27.0';
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import { withRetry } from '../_shared/retry.ts';

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
    // Get API keys from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY');

    if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Get authorization token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get current user
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

    const rateLimit = await enforceRateLimit(supabase, user.id, 'generate-outfit');
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

    // Parse request body
    const { prompt, preferences } = await req.json();

    // Enforce quota server-side (prevents bypassing client checks)
    const { data: canGenerate, error: canGenerateError } = await supabase.rpc('can_user_generate_outfit', {
      p_user_id: user.id,
      p_amount: 1,
    });

    if (canGenerateError) {
      console.error('Error checking generation quota:', canGenerateError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar tu límite. Intentá de nuevo.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!canGenerate) {
      return new Response(
        JSON.stringify({ error: 'Has alcanzado tu límite de créditos. Upgradeá tu plan para continuar.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's clothing items
    const { data: items, error: itemsError } = await supabase
      .from('clothing_items')
      .select('id, name, category, subcategory, color_primary, ai_metadata, tags')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (itemsError) throw itemsError;

    if (!items || items.length < 3) {
      return new Response(
        JSON.stringify({
          error: 'No hay suficientes prendas en tu armario. Añade al menos un top, un pantalón y un par de zapatos.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // Schema for outfit generation
    const fitResultSchema = {
      type: Type.OBJECT,
      properties: {
        top_id: { type: Type.STRING },
        bottom_id: { type: Type.STRING },
        shoes_id: { type: Type.STRING },
        explanation: { type: Type.STRING },
        missing_piece_suggestion: {
          type: Type.OBJECT,
          description: 'Sugerencia opcional para una prenda que falta para completar el look.',
          properties: {
            item_name: { type: Type.STRING, description: "ej: 'White minimalist sneakers'" },
            reason: { type: Type.STRING, description: "ej: 'Tus zapatos actuales son muy deportivos para este look.'" },
          },
          required: ['item_name', 'reason'],
        },
      },
      required: ['top_id', 'bottom_id', 'shoes_id', 'explanation'],
    };

    const systemInstruction = `Eres un estilista personal con un 'ojo de loca' para la moda. Tienes acceso al siguiente inventario de ropa: ${JSON.stringify(
      items
    )}. El usuario quiere un outfit para: "${prompt}".
    Selecciona la mejor combinación (Top + Bottom + Shoes) del inventario.
    Si crees que falta una pieza clave en el inventario para que el outfit sea perfecto (ej: los zapatos disponibles no combinan bien), puedes sugerir una pieza que el usuario podría comprar. Para ello, incluye el campo opcional 'missing_piece_suggestion'.
    Devuelve siempre un JSON con los IDs de las prendas seleccionadas del inventario y una breve explicación de por qué funciona este outfit.`;

    // Generate outfit with Gemini
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: `Aquí está la petición del usuario: "${prompt}"` }] },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: fitResultSchema,
        },
      })
    );

    const outfit = JSON.parse(response.text);

    // Increment usage only after a successful generation
    const { data: incremented, error: incrementError } = await supabase.rpc('increment_ai_generation_usage', {
      p_user_id: user.id,
      p_amount: 1,
    });
    if (incrementError) {
      console.error('Failed to increment usage:', incrementError);
    } else if (!incremented) {
      console.warn('Usage increment returned false (limit reached race?)');
    }

    await recordRequestResult(supabase, user.id, 'generate-outfit', true);

    return new Response(JSON.stringify(outfit), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating outfit:', error);
    if (supabase && userId) {
      await recordRequestResult(supabase, userId, 'generate-outfit', false);
    }
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate outfit',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
