// Supabase Edge Function: Shopping Assistant
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'; // Unified SDK
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import { withRetry } from '../_shared/retry.ts';

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
        if (!geminiApiKey) {
            throw new Error('Missing GEMINI_API_KEY');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase credentials');
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: corsHeaders });
        }

        supabase = createClient(supabaseUrl, supabaseServiceKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
        }
        userId = user.id;

        // Rate Limit
        const rateLimit = await enforceRateLimit(supabase, user.id, 'shopping-assistant');
        if (!rateLimit.allowed) {
            return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: corsHeaders });
        }

        const { action, ...params } = await req.json();
        const genAI = new GoogleGenerativeAI(geminiApiKey);

        // Use Gemini 2.0 Flash for speed + search capabilities
        // Note: verify if googleSearch tool is supported in this SDK version or if we need v1beta
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            tools: [{ googleSearch: {} } as any] // Cast to any if type def is missing in 0.21.0
        });

        if (action === 'analyze-gaps') {
            const { closet } = params;
            // Gap analysis usually doesn't need search, but deep reasoning.
            const prompt = `
                Analyze this closet and find missing essential items (Gaps).
                Closet Summary: ${JSON.stringify(closet.map((i: any) => i.metadata?.category + ' ' + i.metadata?.subcategory).slice(0, 50))}...
                
                Identify 3-5 critical gaps.
                Return JSON: [ { "id": "uuid", "item_name": "string", "category": "string", "reason": "string", "priority": "essential|recommended" } ]
            `;

            const result = await withRetry(() => model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            }));

            return new Response(result.response.text(), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        } else if (action === 'generate-recommendations') {
            const { gaps, budget } = params;

            // ACTION: Search for real products
            const prompt = `
                You are a Personal Shopper in Argentina.
                Task: Find REAL purchasable products for these wardrobe gaps: ${JSON.stringify(gaps)}
                Budget: ${budget || 'Flexible, but prefer value for money'}.
                
                SEARCH STRATEGY:
                - Use Google Search to find current items in stores like Zara Argentina, H&M, Ver, MercadoLibre, Dafiti style stores.
                - Look for "Campera cuero mujer precio argentina", "Zapatillas blancas urbanas oferta", etc.
                - Extract REAL urls and prices in ARS (Argentine Pesos).
                
                OUTPUT:
                Return a JSON Array of recommendations.
                Structure:
                [
                  {
                    "id": "ref-gap-id", 
                    "products": [
                      { "title": "Title", "brand": "Brand", "price": number, "shop_url": "https://...", "image_url": "https://..." }
                    ]
                  }
                ]
            `;

            const result = await withRetry(() => model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            }));

            return new Response(result.response.text(), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        } else if (action === 'chat') {
            const { message, history } = params;

            // Chat with grounding
            const chat = model.startChat({
                history: history.map((h: any) => ({
                    role: h.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: h.content }]
                })),
                generationConfig: {
                    tools: [{ googleSearch: {} } as any]
                }
            });

            const systemPrompt = `
                You are a Stylist & Shopping Assistant.
                - When user asks for products, USE GOOGLE SEARCH to find real items in Argentina/Global.
                - Always provide links.
                - Be concise and helpful.
            `;

            const result = await chat.sendMessage(systemPrompt + '\n User: ' + message);
            const responseText = result.response.text();

            return new Response(JSON.stringify({
                role: 'assistant',
                content: responseText
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        throw new Error('Invalid action');

    } catch (error) {
        console.error('Shopping Assistant Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
});
