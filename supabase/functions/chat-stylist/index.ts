// Supabase Edge Function: Chat with Fashion Stylist
// Secure AI chat that keeps the API key server-side
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'npm:@google/genai@1.27.0';
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

        // Rate limiting for chat (more generous than image generation)
        const rateLimit = await enforceRateLimit(supabase, user.id, 'chat-stylist', {
            maxRequests: 20,
            windowSeconds: 60,
        });
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
        const { message, chatHistory, closetContext } = await req.json();

        if (!message || typeof message !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Missing message' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get closet items if not provided in context
        let inventory = closetContext;
        if (!inventory || !Array.isArray(inventory) || inventory.length === 0) {
            const { data: items, error: itemsError } = await supabase
                .from('clothing_items')
                .select('id, name, category, subcategory, color_primary, ai_metadata, tags')
                .eq('user_id', user.id)
                .is('deleted_at', null);

            if (!itemsError && items) {
                inventory = items.map((item: any) => ({
                    id: item.id,
                    metadata: {
                        category: item.category || item.ai_metadata?.category,
                        subcategory: item.subcategory || item.ai_metadata?.subcategory,
                        color_primary: item.color_primary || item.ai_metadata?.color_primary,
                        vibe_tags: item.tags || item.ai_metadata?.vibe_tags || [],
                        seasons: item.ai_metadata?.seasons || [],
                    }
                }));
            } else {
                inventory = [];
            }
        }

        // Build conversation history for Gemini (map 'assistant' to 'model')
        const conversationHistory = (chatHistory || []).map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // Initialize Gemini AI
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const systemInstruction = `Eres un asistente de moda personal en español con un "ojo de loca" para la moda.

ARMARIO DEL USUARIO:
${JSON.stringify(inventory, null, 2)}

⚠️ REGLAS CRÍTICAS DE IDS - LEER ATENTAMENTE ⚠️:
- COPIAR Y PEGAR EXACTAMENTE los IDs del ARMARIO DEL USUARIO de arriba
- NUNCA NUNCA NUNCA inventes, modifiques o trunces IDs
- CADA CARÁCTER DEL ID debe ser IDÉNTICO al que aparece en la lista (incluyendo guiones y números)
- Si escribes un ID INCORRECTO, el sistema fallará completamente
- VERIFICA TRES VECES que el ID sea exacto antes de incluirlo
- Los IDs son UUIDs largos con formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
- SIEMPRE incluye los 3 items: top, bottom Y shoes en formato [top: ID_COMPLETO, bottom: ID_COMPLETO, shoes: ID_COMPLETO]
- Si no hay zapatos ideales, usa los más parecidos que existan (cualquier zapato > ningún zapato)

INSTRUCCIONES:
- Responde en español de manera amigable y cercana
- Cuando sugieras outfits, describe las prendas de forma descriptiva y amigable
- Usa los metadatos (color, tipo, subcategoría) para hacer referencias naturales: "tu camisa azul", "el jean negro", "tus zapatillas blancas"
- IMPORTANTE: Al final de tu sugerencia, SIEMPRE incluye los IDs técnicos en este formato: [top: ID_TOP, bottom: ID_BOTTOM, shoes: ID_SHOES]
- Sé específica sobre POR QUÉ un outfit funciona (colores, ocasión, estilo)
- Si el armario no tiene zapatos ideales, usa los que más se acerquen Y menciona que podrían complementarse con otros zapatos
- Mantén un tono entusiasta pero profesional
- Considera la ocasión, el clima, y las preferencias del usuario

EJEMPLOS DE RESPUESTAS:
"¡Tengo el outfit perfecto para tu primera cita!

Te sugiero combinar tu camisa blanca con el pantalón negro y las zapatillas casuales. Esta combinación es elegante pero relajada - la camisa blanca proyecta frescura y sofisticación, mientras que el pantalón negro aporta un toque formal sin ser demasiado serio. Las zapatillas le dan ese aire descontracturado que funciona perfecto para una primera cita.

[top: abc-123, bottom: def-456, shoes: ghi-789]"`;

        // Generate response with Gemini
        const response = await withRetry(() =>
            ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    ...conversationHistory,
                    { role: 'user', parts: [{ text: message }] }
                ],
                config: {
                    systemInstruction,
                }
            })
        );

        const responseText = response.text;

        await recordRequestResult(supabase, user.id, 'chat-stylist', true);

        return new Response(
            JSON.stringify({
                role: 'assistant',
                content: responseText,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('Error in chat-stylist:', error);
        if (supabase && userId) {
            await recordRequestResult(supabase, userId, 'chat-stylist', false);
        }
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Failed to process chat message',
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
