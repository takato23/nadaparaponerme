// Supabase Edge Function: Generate Image (Imagen)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
