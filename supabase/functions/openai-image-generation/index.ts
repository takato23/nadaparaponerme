// Supabase Edge Function: Generate Image (OpenAI)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import { withRetry } from '../_shared/retry.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

// OpenAI API URL
const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations';

serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let supabase: any = null;
    let userId: string | null = null;

    try {
        // 2. Validate API Key
        const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openAiApiKey) {
            console.error('Missing OPENAI_API_KEY');
            throw new Error('Server configuration error: Missing OpenAI API Key');
        }

        // 3. User Authentication (prevent abuse)
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

        const rateLimit = await enforceRateLimit(supabase, user.id, 'openai-image-generation');
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

        // 4. Parse Request Payload
        const { prompt, model, quality, size, style, n } = await req.json();

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: 'Missing prompt' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 5. Construct OpenAI Payload
        // Enforce defaults and strict params to minimize errors
        // Use DALL-E 3 (standard) or DALL-E 2.
        // Validate model
        const modelName = model || 'dall-e-3'; // Default to dall-e-3 if not specified
        const allowedModels = ['dall-e-2', 'dall-e-3', 'gpt-image-1.5'];
        if (!allowedModels.includes(modelName)) {
            throw new Error(`Model '${modelName}' is not supported. Supported models: ${allowedModels.join(', ')}`);
        }

        const requestBody: any = {
            model: modelName,
            prompt: prompt,
            n: n || 1, // Use n from request, or default to 1
            size: size || '1024x1024',
        };

        // DALL-E 3 supports quality and style
        if (modelName === 'dall-e-3') {
            requestBody.response_format = 'b64_json';
            requestBody.quality = (quality && quality !== 'low') ? quality : 'standard';
            if (style) requestBody.style = style;
        } else if (modelName === 'gpt-image-1.5') {
            // GPT Image 1.5 specific parameters if any. 
            // It seems strictly stricter on response_format, typically returning URLs by default or supporting standard formats.
            // We omit response_format to accept the default (URL) to be safe, then fetch and convert.
        } else {
            // DALL-E 2
            requestBody.response_format = 'b64_json';
        }

        console.log(`Sending request to OpenAI (${modelName})...`);

        const openAIResponse = await withRetry(async () => {
            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openAiApiKey}`,
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok && response.status >= 500) {
                throw new Error(String(response.status));
            }
            if (!response.ok && response.status === 429) {
                throw new Error('429');
            }
            return response;
        });

        if (!openAIResponse.ok) {
            const errorData = await openAIResponse.json().catch(() => ({}));
            console.error('OpenAI API Error:', errorData);
            const errorMessage = errorData?.error?.message || 'Error generating image with OpenAI';
            return new Response(JSON.stringify({
                error: errorMessage,
                type: errorData?.error?.type,
                code: errorData?.error?.code,
            }), {
                status: openAIResponse.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const data = await openAIResponse.json();
        let imageBase64 = '';

        // Handle response based on format (b64_json or url)
        if (data.data && data.data.length > 0) {
            if (data.data[0].b64_json) {
                imageBase64 = data.data[0].b64_json;
            } else if (data.data[0].url) {
                // Fetch image from URL and convert to base64
                console.log('Received Image URL, fetching content...');
                const imageRes = await fetch(data.data[0].url);
                if (!imageRes.ok) throw new Error('Failed to download generated image from OpenAI URL');
                const imageBuffer = await imageRes.arrayBuffer();
                imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
            }
        }

        if (!imageBase64) {
            throw new Error('No image data received from OpenAI');
        }

        // Return the image
        const resultImage = `data:image/png;base64,${imageBase64}`;
        await recordRequestResult(supabase, user.id, 'openai-image-generation', true);

        return new Response(JSON.stringify({
            resultImage,
            image: resultImage,
            prompt: prompt,
            model: modelName
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in openai-image-generation:', error);
        if (supabase && userId) {
            await recordRequestResult(supabase, userId, 'openai-image-generation', false);
        }
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
