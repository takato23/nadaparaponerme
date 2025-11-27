// Supabase Edge Function: Virtual Try-On with Gemini AI
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

        const { userImage, topImage, bottomImage, shoesImage } = await req.json();

        if (!userImage || !topImage || !bottomImage || !shoesImage) {
            return new Response(
                JSON.stringify({ error: 'Missing required images' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const imageSources = [userImage, topImage, bottomImage, shoesImage];
        const imageParts = [];

        for (const src of imageSources) {
            const [mime, base64] = src.split(';base64,');
            if (base64 && mime) {
                imageParts.push({
                    inlineData: {
                        data: base64,
                        mimeType: mime.split(':')[1]
                    }
                });
            }
        }

        if (imageParts.length !== 4) {
            throw new Error("Invalid image data");
        }

        const prompt = 'Eres un asistente de moda experto. Viste a la persona en la primera imagen con la ropa de las tres imágenes que le siguen (top, pantalón, zapatos). Combina la ropa de forma realista sobre el cuerpo de la persona, manteniendo su rostro, pose y el fondo original. La salida debe ser solo la imagen final.';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Updated to latest stable model
            contents: {
                parts: [
                    { text: prompt },
                    ...imageParts
                ],
            },
            config: {
                // @ts-ignore - responseModalities might not be typed in this version but is required for image output
                responseModalities: ["IMAGE"],
            },
        });

        // Extract image from response
        // Note: The structure depends on the SDK version and response.
        // Assuming standard Gemini response structure for image generation/editing if supported.
        // If 'gemini-2.5-flash-image' returns an image in the candidates.

        const candidate = response.candidates?.[0];
        const part = candidate?.content?.parts?.[0];

        if (part && part.inlineData) {
            const base64ImageBytes = part.inlineData.data;
            const resultImage = `data:image/png;base64,${base64ImageBytes}`;

            return new Response(JSON.stringify({ resultImage }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        } else {
            throw new Error("No image returned from AI");
        }

    } catch (error) {
        console.error('Error in virtual-try-on:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
