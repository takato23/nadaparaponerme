// Supabase Edge Function: Generate Packing List with Gemini AI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, Type } from 'npm:@google/genai@1.27.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get API keys from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Get authorization token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get current user
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

    // Parse request body
    const { prompt } = await req.json();

    // Get user's clothing items
    const { data: items, error: itemsError } = await supabase
      .from('clothing_items')
      .select('id, name, category, subcategory, color_primary, ai_metadata, tags')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (itemsError) throw itemsError;

    if (!items || items.length < 3) {
      return new Response(
        JSON.stringify({
          error: 'No hay suficientes prendas en tu armario para hacer una maleta.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // Schema for packing list generation
    const packingListSchema = {
      type: Type.OBJECT,
      properties: {
        packing_list: {
          type: Type.ARRAY,
          description: 'An array of item IDs from the inventory to pack for the trip.',
          items: { type: Type.STRING },
        },
        outfit_suggestions: {
          type: Type.STRING,
          description:
            'A markdown-formatted string suggesting several outfits. ej: \'- **Look de Día:** Prenda A + Prenda B. Perfecto para pasear.\\n- **Look de Noche:** Prenda D + Prenda E. Ideal para una cena.\'',
        },
      },
      required: ['packing_list', 'outfit_suggestions'],
    };

    const systemInstruction = `Eres un estilista de viajes experto. Tienes acceso al siguiente inventario de ropa: ${JSON.stringify(
      items
    )}.
    El usuario necesita hacer una maleta para: "${prompt}".
    Crea una lista de equipaje compacta y versátil seleccionando prendas del inventario.
    Además, proporciona algunas sugerencias de outfits que se pueden crear con los artículos seleccionados.
    Devuelve un JSON con los IDs de las prendas a empacar y las sugerencias de outfits en formato markdown.`;

    // Generate packing list with Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [{ text: `Detalles del viaje: "${prompt}"` }] },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: packingListSchema,
      },
    });

    const packingList = JSON.parse(response.text);

    return new Response(JSON.stringify(packingList), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating packing list:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate packing list',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
