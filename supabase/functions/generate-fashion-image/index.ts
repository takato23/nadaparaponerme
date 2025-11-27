// SIMPLIFIED VERSION - Testing Gemini API without database dependencies
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

// Enhanced prompt with style requirements
function enhancePrompt(userPrompt: string, stylePreferences?: Record<string, unknown>): string {
  return `Generate a high-quality, photorealistic fashion product image: ${userPrompt}

Style requirements:
- Professional studio lighting
- Clean white or neutral background
- Product-focused composition
- High detail and texture
- Fashion photography aesthetic
- 1024x1024px resolution

${stylePreferences ? `Additional style: ${JSON.stringify(stylePreferences)}` : ''}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Get environment variables
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:', {
      hasGeminiKey: !!geminiApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    });

    if (!geminiApiKey) {
      throw new Error('Missing GEMINI_API_KEY');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing authorization header',
          error_code: 'AUTH_REQUIRED'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user token (but don't use database)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          error_code: 'INVALID_TOKEN',
          details: userError?.message
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Parse request body
    const { prompt, model_type = 'flash', style_preferences } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Prompt requerido',
          error_code: 'INVALID_PROMPT'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating image with prompt:', prompt.substring(0, 100));

    // Generate image with Gemini image models
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    // Usar los nombres correctos según la API
    const modelName = model_type === 'pro' ? 'models/gemini-3-pro-image-preview' : 'models/gemini-2.5-flash-image';
    const model = genAI.getGenerativeModel({ model: modelName });

    const enhancedPromptText = enhancePrompt(prompt, style_preferences);

    console.log('Calling Gemini Imagen API with model:', modelName);

    // Llamada simplificada para modelos Imagen
    const result = await model.generateContent(enhancedPromptText);

    const response = await result.response;
    console.log('Imagen response received');

    // Extract image data from response
    const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!imageData || !imageData.data) {
      console.error('No image data in response:', JSON.stringify(response, null, 2));
      throw new Error('No se generó imagen en la respuesta de Gemini');
    }

    console.log('Image data received, size:', imageData.data.length);

    // Convert base64 to data URL
    const mimeType = imageData.mimeType || 'image/png';
    const imageUrl = `data:${mimeType};base64,${imageData.data}`;

    const generationTimeMs = Date.now() - startTime;

    console.log('Image generation successful in', generationTimeMs, 'ms');

    // Return success response with base64 image
    return new Response(
      JSON.stringify({
        success: true,
        image_url: imageUrl, // Base64 data URL instead of storage URL
        generation_time_ms: generationTimeMs,
        remaining_quota: 9, // Hardcoded for testing
        model_used: model_type,
        current_tier: 'free', // Hardcoded for testing
        message: 'Image generated successfully (testing mode - not saved to database)',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating image:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error al generar imagen',
        error_code: 'GENERATION_ERROR',
        error_details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
