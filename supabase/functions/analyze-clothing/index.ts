// Supabase Edge Function: Analyze Clothing Item with Gemini AI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenAI, Type } from 'npm:@google/genai@1.27.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Parse request body (expecting JSON with imageDataUrl)
    const { imageDataUrl } = await req.json();

    if (!imageDataUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing imageDataUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract base64 and mime type from data URL
    const [mimeTypePart, base64Data] = imageDataUrl.split(';base64,');
    const mimeType = mimeTypePart.split(':')[1];

    if (!base64Data || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'Invalid image data URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const base64 = base64Data;

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // Schema for clothing analysis
    const clothingItemSchema = {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: 'ej: "top", "bottom", "shoes", "accessory", "outerwear", "one-piece"',
        },
        subcategory: {
          type: Type.STRING,
          description: 'ej: "graphic tee", "cargo pants", "sneakers", "t-shirt", "jeans", "dress", "jacket"',
        },
        color_primary: {
          type: Type.STRING,
          description: 'el color principal dominante',
        },
        neckline: {
          type: Type.STRING,
          description: 'Opcional. Tipo de cuello si aplica. ej: "cuello redondo", "cuello en V", "cuello alto", "strapless"',
        },
        sleeve_type: {
          type: Type.STRING,
          description: 'Opcional. Tipo de manga si aplica. ej: "manga corta", "manga larga", "sin mangas", "tirantes"',
        },
        vibe_tags: {
          type: Type.ARRAY,
          description: 'ej: "streetwear", "casual", "sporty", "elegant", "boho", "minimalist"',
          items: {
            type: Type.STRING,
          },
        },
        seasons: {
          type: Type.ARRAY,
          description: 'array de: "spring", "summer", "autumn", "winter"',
          items: {
            type: Type.STRING,
          },
        },
      },
      required: ['category', 'subcategory', 'color_primary', 'vibe_tags', 'seasons'],
    };

    // Analyze image with Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64,
              mimeType,
            },
          },
        ],
      },
      config: {
        systemInstruction:
          'Eres un experto en moda. Analiza la prenda en la imagen y describe sus características, prestando especial atención a detalles como el tipo de cuello y de manga si son visibles.',
        responseMimeType: 'application/json',
        responseSchema: clothingItemSchema,
      },
    });

    const analysis = JSON.parse(response.text);

    // Return the analysis directly (client expects ClothingItemMetadata format)
    return new Response(
      JSON.stringify(analysis),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error analyzing clothing:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to analyze clothing item',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
