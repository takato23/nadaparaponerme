// Supabase Edge Function: Analyze Color Palette
// Analyzes the color composition of a user's closet
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, Type } from 'npm:@google/genai@1.27.0';
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import { withRetry } from '../_shared/retry.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

// Schema for color palette analysis
const colorPaletteSchema = {
    type: Type.OBJECT,
    properties: {
        dominant_colors: {
            type: Type.ARRAY,
            description: 'Top 5-8 colores dominantes en el armario con información hex y porcentaje',
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Nombre del color en español (ej: 'Negro', 'Azul marino')" },
                    hex: { type: Type.STRING, description: "Código hexadecimal del color (ej: '#000000')" },
                    percentage: { type: Type.NUMBER, description: 'Porcentaje aproximado de este color en el armario' }
                },
                required: ['name', 'hex', 'percentage']
            }
        },
        color_scheme: {
            type: Type.STRING,
            description: "Esquema cromático detectado: 'monochromatic', 'complementary', 'analogous', 'triadic', o 'diverse'"
        },
        missing_colors: {
            type: Type.ARRAY,
            description: 'Sugerencias de colores que faltan para mejorar versatilidad (máximo 5)',
            items: { type: Type.STRING }
        },
        versatility_score: {
            type: Type.NUMBER,
            description: 'Puntuación de versatilidad del armario de 0-100 basada en balance de colores'
        },
        recommendations: {
            type: Type.STRING,
            description: 'Recomendaciones personalizadas para mejorar la paleta de colores (2-3 frases)'
        }
    },
    required: ['dominant_colors', 'color_scheme', 'missing_colors', 'versatility_score', 'recommendations']
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

        // Auth required
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

        // Optional closed beta allowlist
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

        // Rate limiting
        const rateLimit = await enforceRateLimit(supabase, user.id, 'analyze-color-palette');
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

        // Parse request body or fetch from database
        let { closetItems } = await req.json().catch(() => ({ closetItems: null }));

        // If no items provided, fetch from database
        if (!closetItems || !Array.isArray(closetItems) || closetItems.length === 0) {
            const { data: items, error: itemsError } = await supabase
                .from('clothing_items')
                .select('id, category, subcategory, color_primary, ai_metadata, tags')
                .eq('user_id', user.id)
                .is('deleted_at', null);

            if (itemsError) throw itemsError;

            if (!items || items.length === 0) {
                return new Response(
                    JSON.stringify({ error: 'No hay prendas en el armario para analizar.' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            closetItems = items.map((item: any) => ({
                id: item.id,
                category: item.category || item.ai_metadata?.category,
                color_primary: item.color_primary || item.ai_metadata?.color_primary,
                vibes: item.tags || item.ai_metadata?.vibe_tags || [],
            }));
        }

        // Extract colors for analysis
        const colors = closetItems.map((item: any) => ({
            id: item.id,
            category: item.category,
            primary_color: item.color_primary,
            vibes: item.vibes
        }));

        // Initialize Gemini AI
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const systemInstruction = `Eres un experto en teoría del color y moda. Analiza la paleta de colores del siguiente armario: ${JSON.stringify(colors)}.

    Identifica:
    1. Los colores dominantes (top 5-8) con sus códigos hex aproximados y porcentaje de presencia
    2. El esquema cromático general (monocromático si hay principalmente variaciones de un color, complementario si hay opuestos en la rueda cromática, análogo si hay colores adyacentes, triádico si hay 3 colores equidistantes, o diverse si es muy variado)
    3. Qué colores versátiles faltan (priorizando neutros como blanco, negro, beige, gris, y colores base como azul marino)
    4. Una puntuación de versatilidad (0-100) considerando: balance de neutros/colores, presencia de colores base, facilidad para combinar
    5. Recomendaciones específicas para mejorar la paleta

    Sé específico con los códigos hex y nombres de colores en español.`;

        // Analyze with Gemini
        const response = await withRetry(() =>
            ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: 'Analiza la paleta de colores de mi armario' }] },
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: colorPaletteSchema,
                }
            })
        );

        const analysis = JSON.parse(response.text);

        await recordRequestResult(supabase, user.id, 'analyze-color-palette', true);

        return new Response(
            JSON.stringify(analysis),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('Error analyzing color palette:', error);
        if (supabase && userId) {
            await recordRequestResult(supabase, userId, 'analyze-color-palette', false);
        }
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to analyze color palette',
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
