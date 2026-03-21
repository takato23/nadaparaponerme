// Supabase Edge Function: Shopping Assistant
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'; // Unified SDK
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import { withRetry } from '../_shared/retry.ts';
import { isForbiddenHost } from '../_shared/security.ts';
import { buildDupeFinderResultV2 } from '../_shared/shoppingDupePipeline.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
};

const IMAGE_FETCH_TIMEOUT_MS = 10_000;
const IMAGE_FETCH_MAX_BYTES = 8_388_608;

function uint8ToBase64(bytes: Uint8Array): string {
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

async function parseImagePayload(input: unknown, errorMessage: string): Promise<{ base64Data: string; mimeType: string }> {
    const value = typeof input === 'string' ? input.trim() : '';
    if (!value) {
        throw new Error(errorMessage);
    }

    if (value.startsWith('data:image')) {
        const [header, base64Data] = value.split(',');
        const mimeType = header?.match(/:(.*?);/)?.[1] || 'image/jpeg';
        if (!base64Data || !mimeType) {
            throw new Error(errorMessage);
        }
        return { base64Data, mimeType };
    }

    if (!value.startsWith('https://')) {
        throw new Error(errorMessage);
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(value);
    } catch {
        throw new Error(errorMessage);
    }

    const host = parsedUrl.hostname.toLowerCase();
    if (isForbiddenHost(host)) {
        throw new Error(errorMessage);
    }

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), IMAGE_FETCH_TIMEOUT_MS);

    const response = await fetch(parsedUrl.toString(), {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SupabaseEdge/1.0)',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        signal: timeoutController.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error(errorMessage);
    }

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('image/')) {
        throw new Error(errorMessage);
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > IMAGE_FETCH_MAX_BYTES) {
        throw new Error(errorMessage);
    }

    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > IMAGE_FETCH_MAX_BYTES) {
        throw new Error(errorMessage);
    }

    return {
        base64Data: uint8ToBase64(buffer),
        mimeType: contentType.split(';')[0],
    };
}

const parseJsonResponse = (raw: string): any => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return {};

    try {
        return JSON.parse(trimmed);
    } catch {
        const withoutFence = trimmed
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
        try {
            return JSON.parse(withoutFence);
        } catch {
            const objectStart = withoutFence.indexOf('{');
            const objectEnd = withoutFence.lastIndexOf('}');
            if (objectStart >= 0 && objectEnd > objectStart) {
                const objectCandidate = withoutFence.slice(objectStart, objectEnd + 1);
                try {
                    return JSON.parse(objectCandidate);
                } catch {
                    // continue to array fallback
                }
            }

            const arrayStart = withoutFence.indexOf('[');
            const arrayEnd = withoutFence.lastIndexOf(']');
            if (arrayStart >= 0 && arrayEnd > arrayStart) {
                const arrayCandidate = withoutFence.slice(arrayStart, arrayEnd + 1);
                return JSON.parse(arrayCandidate);
            }

            throw new Error('No se pudo parsear la respuesta JSON del modelo.');
        }
    }
};

const normalizeBrandRecognitionResult = (parsed: any) => ({
    brand: {
        name: parsed?.brand?.name || 'Sin marca visible',
        confidence: Number(parsed?.brand?.confidence ?? 0),
        detected_from: parsed?.brand?.detected_from || 'mixed',
        country_origin: parsed?.brand?.country_origin || undefined,
        brand_tier: parsed?.brand?.brand_tier || 'unknown',
    },
    price_estimate: {
        currency: parsed?.price_estimate?.currency || 'USD',
        min_price: Number(parsed?.price_estimate?.min_price ?? 0),
        max_price: Number(parsed?.price_estimate?.max_price ?? 0),
        average_price: Number(parsed?.price_estimate?.average_price ?? 0),
        confidence: Number(parsed?.price_estimate?.confidence ?? 0),
        factors: Array.isArray(parsed?.price_estimate?.factors) ? parsed.price_estimate.factors : [],
    },
    authenticity: {
        status: parsed?.authenticity?.status || 'indeterminate',
        confidence: Number(parsed?.authenticity?.confidence ?? 0),
        indicators: Array.isArray(parsed?.authenticity?.indicators) ? parsed.authenticity.indicators : [],
        warnings: Array.isArray(parsed?.authenticity?.warnings) ? parsed.authenticity.warnings : undefined,
    },
    item_condition: parsed?.item_condition || 'fair',
    resale_value_percentage: Number(parsed?.resale_value_percentage ?? 0),
    market_insights: parsed?.market_insights || 'No se pudo obtener insight de mercado.',
    shopping_alternatives: Array.isArray(parsed?.shopping_alternatives) ? parsed.shopping_alternatives : undefined,
    analyzed_at: new Date().toISOString(),
});

const extractGroundingLinks = (result: any): Array<{ web: { uri: string; title?: string } }> => {
    const chunks = result?.response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (!Array.isArray(chunks)) return [];

    return chunks
        .filter((chunk: any) => chunk?.web?.uri)
        .map((chunk: any) => ({
            web: {
                uri: String(chunk.web.uri),
                title: chunk.web.title ? String(chunk.web.title) : undefined,
            }
        }));
};

const toApproxUsd = (price: number, currency: string): number => {
    if (!Number.isFinite(price) || price <= 0) return 0;
    if (currency === 'USD') return price;
    if (currency === 'ARS') return price / 1000;
    if (currency === 'EUR') return price * 1.1;
    return price;
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

        // Modelo base para respuestas estructuradas (JSON)
        const structuredModel = genAI.getGenerativeModel({
            model: 'gemini-3.1-flash-lite-preview',
        } as any);

        // Modelo con búsqueda web para shopping/chat grounding.
        // Importante: cuando se usan tools no se puede forzar responseMimeType JSON en esta API.
        const modelWithSearch = genAI.getGenerativeModel({
            model: 'gemini-3.1-flash-lite-preview',
            tools: [{ googleSearch: {} } as any] // Cast to any if type def is missing in 0.21.0
        } as any);

        if (action === 'search-products-for-item') {
            const itemDescription = String(params?.itemDescription || '').trim();
            const category = String(params?.category || '').trim();
            if (!itemDescription) {
                return new Response(JSON.stringify({ error: 'Falta descripción de prenda.' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const categoryHint = category ? ` (${category})` : '';
            const prompt = `Buscar tiendas online para comprar: ${itemDescription}${categoryHint}.
            Priorizá tiendas de Argentina y Latinoamérica como Mercado Libre, Dafiti, Zara, H&M.
            También incluir tiendas internacionales si aportan buenas opciones.`;

            const result = await withRetry(() => modelWithSearch.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            }));

            return new Response(JSON.stringify({ links: extractGroundingLinks(result) }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } else if (action === 'search-products-by-image') {
            const { imageDataUrl } = params;
            let imagePayload: { base64Data: string; mimeType: string };
            try {
                imagePayload = await parseImagePayload(imageDataUrl, 'La imagen no es válida.');
            } catch {
                return new Response(JSON.stringify({ error: 'La imagen no es válida.' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const analysisPrompt = `Analizá esta imagen de una prenda y devolvé SOLO JSON:
            {
              "description": "descripción para buscar productos",
              "category": "top|bottom|shoes|accessory|outerwear|unknown"
            }`;

            const analysisResult = await withRetry(() => structuredModel.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        { inlineData: { data: imagePayload.base64Data, mimeType: imagePayload.mimeType } } as any,
                        { text: analysisPrompt }
                    ]
                }],
                generationConfig: { responseMimeType: 'application/json' }
            }));

            const analysis = parseJsonResponse(analysisResult.response.text());
            const description = String(analysis?.description || '').trim();
            const category = String(analysis?.category || 'unknown').trim();

            if (!description) {
                return new Response(JSON.stringify({ description: '', category: 'unknown', links: [] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const searchPrompt = `Buscar opciones para comprar esta prenda: ${description} (${category}).
            Priorizá resultados con links de compra reales.`;
            const searchResult = await withRetry(() => modelWithSearch.generateContent({
                contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
            }));

            return new Response(JSON.stringify({
                description,
                category,
                links: extractGroundingLinks(searchResult)
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } else if (action === 'recognize-brand') {
            const { imageDataUrl } = params;
            let imagePayload: { base64Data: string; mimeType: string };
            try {
                imagePayload = await parseImagePayload(imageDataUrl, 'La imagen no es válida.');
            } catch {
                return new Response(JSON.stringify({ error: 'La imagen no es válida.' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const prompt = `
                Analizá esta prenda y devolvé SOLO JSON con esta estructura exacta:
                {
                  "brand": { "name": "string", "confidence": number, "detected_from": "logo|label|style_pattern|mixed", "country_origin": "string opcional", "brand_tier": "luxury|premium|mid-range|budget|unknown" },
                  "price_estimate": { "currency": "USD|ARS|EUR", "min_price": number, "max_price": number, "average_price": number, "confidence": number, "factors": ["string"] },
                  "authenticity": { "status": "original|replica|indeterminate", "confidence": number, "indicators": ["string"], "warnings": ["string opcional"] },
                  "item_condition": "new|like_new|good|fair|worn",
                  "resale_value_percentage": number,
                  "market_insights": "string",
                  "shopping_alternatives": ["string opcional"]
                }
                Reglas:
                - Español argentino.
                - Si no se puede determinar marca, usar "Sin marca visible" y confidence bajo.
                - No agregues texto fuera del JSON.
            `;

            const result = await withRetry(() => structuredModel.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        { inlineData: { data: imagePayload.base64Data, mimeType: imagePayload.mimeType } } as any,
                        { text: prompt }
                    ]
                }],
                generationConfig: { responseMimeType: 'application/json' }
            }));

            const parsed = parseJsonResponse(result.response.text());
            const normalized = normalizeBrandRecognitionResult(parsed);

            return new Response(JSON.stringify(normalized), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        } else if (action === 'find-dupes') {
            const {
                item,
                brandInfo,
                useV2Pipeline,
                enableLinkVerification,
                countryCode,
                locale,
            } = params;
            const imageDataUrl = item?.imageDataUrl;
            let imagePayload: { base64Data: string; mimeType: string };
            try {
                imagePayload = await parseImagePayload(imageDataUrl, 'La imagen de la prenda no es válida.');
            } catch {
                return new Response(JSON.stringify({ error: 'La imagen de la prenda no es válida.' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (useV2Pipeline !== false) {
                try {
                    const v2Response = await buildDupeFinderResultV2({
                        item,
                        brandInfo,
                        imagePayload,
                        modelWithSearch,
                        countryCode: typeof countryCode === 'string' ? countryCode : undefined,
                        locale: typeof locale === 'string' ? locale : undefined,
                        enableLinkVerification: enableLinkVerification !== false,
                        toApproxUsd,
                    });

                    return new Response(JSON.stringify(v2Response), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                } catch (v2Error) {
                    console.error('Shopping Assistant V2 failed, falling back to legacy pipeline:', v2Error);
                }
            }

            const category = item?.metadata?.category || 'unknown';
            const subcategory = item?.metadata?.subcategory || 'unknown';
            const colorPrimary = item?.metadata?.color_primary || 'unknown';
            const brandName = brandInfo?.brand?.name || 'unknown';
            const originalPrice = Number(brandInfo?.price_estimate?.average_price || 0);

            const prompt = `
                Encontrá 3 a 5 dupes (alternativas más baratas) de esta prenda usando búsqueda web.
                Datos de referencia:
                - Categoría: ${category}
                - Subcategoría: ${subcategory}
                - Color: ${colorPrimary}
                - Marca original: ${brandName}
                - Precio original estimado (si existe): ${originalPrice || 'desconocido'} USD

                Devolvé SOLO JSON con esta estructura:
                {
                  "dupes": [
                    {
                      "title": "string",
                      "brand": "string",
                      "price": number,
                      "currency": "USD|ARS|EUR",
                      "shop_name": "string",
                      "shop_url": "https://...",
                      "image_url": "https://... opcional",
                      "similarity_score": number,
                      "key_differences": ["string"],
                      "savings_amount": number,
                      "savings_percentage": number,
                      "estimated_quality": "high|medium|low|unknown"
                    }
                  ],
                  "visual_comparison": {
                    "similarities": ["string"],
                    "differences": ["string"],
                    "overall_match": number
                  },
                  "search_strategy": "string",
                  "confidence_level": "low|medium|high"
                }

                Reglas:
                - Priorizá similitud visual y precio más bajo.
                - No inventes links.
                - Español argentino.
                - No agregues texto fuera del JSON.
            `;

            const result = await withRetry(() => modelWithSearch.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        { inlineData: { data: imagePayload.base64Data, mimeType: imagePayload.mimeType } } as any,
                        { text: prompt }
                    ]
                }]
            }));

            const parsed = parseJsonResponse(result.response.text());
            const dupes = Array.isArray(parsed?.dupes) ? parsed.dupes : [];

            const pricesUsd = dupes
                .map((d: any) => toApproxUsd(Number(d?.price || 0), String(d?.currency || 'USD')))
                .filter((p: number) => p > 0);

            const cheapestDupe = pricesUsd.length > 0 ? Math.min(...pricesUsd) : 0;
            const averageDupe = pricesUsd.length > 0 ? pricesUsd.reduce((acc: number, p: number) => acc + p, 0) / pricesUsd.length : 0;
            const normalizedOriginal = originalPrice > 0 ? originalPrice : (averageDupe > 0 ? averageDupe * 2.5 : 50);

            const response = {
                original_item: {
                    id: item?.id || `tmp-${Date.now()}`,
                    brand: brandName !== 'unknown' ? brandName : undefined,
                    estimated_price: originalPrice > 0 ? originalPrice : undefined,
                    category,
                    subcategory,
                },
                dupes,
                visual_comparison: {
                    similarities: Array.isArray(parsed?.visual_comparison?.similarities) ? parsed.visual_comparison.similarities : [],
                    differences: Array.isArray(parsed?.visual_comparison?.differences) ? parsed.visual_comparison.differences : [],
                    overall_match: Number(parsed?.visual_comparison?.overall_match ?? 0),
                },
                savings: {
                    original_price: normalizedOriginal,
                    cheapest_dupe_price: cheapestDupe,
                    max_savings: normalizedOriginal - cheapestDupe,
                    average_dupe_price: averageDupe,
                    average_savings: normalizedOriginal - averageDupe,
                    currency: 'USD',
                },
                search_strategy: parsed?.search_strategy || 'Búsqueda en tiendas online por similitud visual y precio.',
                confidence_level: parsed?.confidence_level || (dupes.length >= 3 ? 'medium' : 'low'),
                analyzed_at: new Date().toISOString(),
            };

            return new Response(JSON.stringify(response), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        } else if (action === 'find-similar-by-image') {
            const { searchImage, inventory } = params;
            let imagePayload: { base64Data: string; mimeType: string };
            try {
                imagePayload = await parseImagePayload(searchImage, 'La imagen de búsqueda no es válida.');
            } catch {
                return new Response(JSON.stringify({ error: 'La imagen de búsqueda no es válida.' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            if (!Array.isArray(inventory) || inventory.length === 0) {
                return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            const simplifiedInventory = inventory.map((item: any) => ({
                id: item.id,
                category: item?.metadata?.category || 'unknown',
                subcategory: item?.metadata?.subcategory || 'unknown',
                color_primary: item?.metadata?.color_primary || 'unknown',
                vibe_tags: Array.isArray(item?.metadata?.vibe_tags) ? item.metadata.vibe_tags : [],
            }));

            const prompt = `
                Compará esta imagen contra el inventario y devolvé SOLO los IDs más similares.
                Inventario:
                ${JSON.stringify(simplifiedInventory, null, 2)}

                Devolvé SOLO JSON:
                { "similar_item_ids": ["id1", "id2", "id3"] }

                Reglas:
                - Solo IDs que existan en inventario.
                - Ordenados por similitud (mayor primero).
                - Máximo 10 IDs.
                - Sin texto fuera del JSON.
            `;

            const result = await withRetry(() => structuredModel.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        { inlineData: { data: imagePayload.base64Data, mimeType: imagePayload.mimeType } } as any,
                        { text: prompt }
                    ]
                }],
                generationConfig: { responseMimeType: 'application/json' }
            }));

            const parsed = parseJsonResponse(result.response.text());
            const validIds = new Set(simplifiedInventory.map((item: any) => item.id));
            const similarIds = Array.isArray(parsed?.similar_item_ids)
                ? parsed.similar_item_ids.filter((id: any) => typeof id === 'string' && validIds.has(id)).slice(0, 10)
                : [];

            return new Response(JSON.stringify(similarIds), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        } else if (action === 'analyze-gaps') {
            const { closet } = params;
            // Gap analysis usually doesn't need search, but deep reasoning.
            const prompt = `
                Analyze this closet and find missing essential items (Gaps).
                Closet Summary: ${JSON.stringify(closet.map((i: any) => i.metadata?.category + ' ' + i.metadata?.subcategory).slice(0, 50))}...
                
                Identify 3-5 critical gaps.
                Return JSON: [ { "id": "uuid", "item_name": "string", "category": "string", "reason": "string", "priority": "essential|recommended" } ]
            `;

            const result = await withRetry(() => structuredModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
            }));

            return new Response(JSON.stringify(parseJsonResponse(result.response.text())), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

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

            const result = await withRetry(() => modelWithSearch.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            }));

            return new Response(JSON.stringify(parseJsonResponse(result.response.text())), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (action === 'chat') {
            const { message, history } = params;

            // Chat with grounding
            const chat = modelWithSearch.startChat({
                history: history.map((h: any) => ({
                    role: h.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: h.content }]
                }))
            } as any);

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
        const message = error instanceof Error ? error.message : 'Unknown shopping assistant error';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
