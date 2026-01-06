// Supabase Edge Function: Shopping Assistant
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, Type } from 'npm:@google/genai@1.27.0';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

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

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

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

        const { action, ...params } = await req.json();
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        if (action === 'analyze-gaps') {
            const { closet } = params;
            // Logic for analyzing gaps
            const systemInstruction = `Eres un experto estilista de moda. Analiza el armario del usuario y detecta "gaps" o faltantes clave.
        Identifica prendas básicas o versátiles que faltan y que ayudarían a multiplicar las combinaciones posibles.
        Clasifica cada gap como 'essential', 'recommended' o 'optional'.
        Devuelve un array de objetos ShoppingGap.`;

            const schema = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        item_name: { type: Type.STRING },
                        category: { type: Type.STRING },
                        reason: { type: Type.STRING },
                        priority: { type: Type.STRING, enum: ['essential', 'recommended', 'optional'] }
                    },
                    required: ['id', 'item_name', 'category', 'reason', 'priority']
                }
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: `Analiza este armario: ${JSON.stringify(closet.map((i: any) => ({ id: i.id, name: i.metadata.subcategory, category: i.metadata.category, color: i.metadata.color_primary })))}` }] },
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            });

            return new Response(response.text, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        } else if (action === 'generate-recommendations') {
            const { gaps, closet, budget } = params;
            // Logic for recommendations
            const systemInstruction = `Eres un personal shopper. Basado en los gaps identificados y el armario existente, sugiere productos específicos para comprar.
        Genera recomendaciones concretas. Si se provee presupuesto, respétalo.`;

            const schema = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        gap_id: { type: Type.STRING },
                        products: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    brand: { type: Type.STRING },
                                    price: { type: Type.NUMBER },
                                    url: { type: Type.STRING },
                                    image_url: { type: Type.STRING }
                                }
                            }
                        },
                        total_budget_estimate: { type: Type.NUMBER }
                    }
                }
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: `Genera recomendaciones para estos gaps: ${JSON.stringify(gaps)}` }] },
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            });

            return new Response(response.text, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        } else if (action === 'chat') {
            const { message, history, context } = params;
            // Logic for chat
            const systemInstruction = `Eres un asistente de compras de moda. Ayuda al usuario a encontrar lo que busca, responde dudas sobre las recomendaciones y asesora sobre estilo.`;

            // Construct history for Gemini
            const chatHistory = history.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [...chatHistory, { role: 'user', parts: [{ text: message }] }],
                config: { systemInstruction }
            });

            const responseText = response.text;
            const responseMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: responseText,
                timestamp: new Date().toISOString()
            };

            return new Response(JSON.stringify(responseMessage), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        throw new Error('Invalid action');

    } catch (error) {
        console.error('Error in shopping-assistant:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
