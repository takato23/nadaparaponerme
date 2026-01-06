// Supabase Edge Function: Generate Image (Imagen)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'npm:@google/genai@1.27.0';

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

        const { prompt } = await req.json();

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: 'Missing prompt' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const enhancedPrompt = `A high-quality studio photograph of ${prompt}, on a clean, neutral white background. The item should be the main focus, with no distractions. Centered composition.`;

        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-001', // Updated to latest stable or use 'imagen-4.0-generate-001' if available/preferred
            prompt: enhancedPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            const resultImage = `data:image/jpeg;base64,${base64ImageBytes}`;

            return new Response(JSON.stringify({ resultImage }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        } else {
            throw new Error("Image generation failed");
        }

    } catch (error) {
        console.error('Error in generate-image:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
