import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0';
// import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts'; // Optional: Use if needed
import { withRetry } from '../_shared/retry.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { closet } = await req.json();

        if (!closet || !Array.isArray(closet) || closet.length === 0) {
            throw new Error('Closet array is required and cannot be empty');
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            throw new Error('Invalid user token');
        }

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiApiKey) {
            throw new Error('GEMINI_API_KEY is not set');
        }

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Prepare closet summary for the prompt
        const closetSummary = closet.map((item: any) => {
            const meta = item.metadata || {};
            return `- ${meta.category || 'Item'}: ${meta.subcategory || 'Generic'}, ${meta.color_primary || 'Unknown color'}, Style: ${meta.style || 'Casual'}`;
        }).join('\n');

        const prompt = `
      You are an expert fashion stylist AI. Analyze the following wardrobe inventory and extract the user's "Style DNA".
      
      Wardrobe Inventory:
      ${closetSummary}
      
      Based strictly on these items, identify:
      1. Top 3 Style Archetypes (e.g., Minimalist, Bohemian, Streetwear, Classic, Edgy).
      2. 3-5 Key Style Traits (e.g., "Loves neutral tones", "Prioritizes comfort", "Mixes vintage with modern").
      3. A Color Profile including:
         - Primary colors (dominant in wardrobe)
         - Secondary colors (accents)
         - Avoid colors (missing or clashing)
      
      Return ONLY valid JSON with this structure:
      {
        "archetypes": [
           { "name": "Archetype Name", "percentage": 70, "description": "Short explanation" },
           { ... } 
        ],
        "traits": [ "Trait 1", "Trait 2", ... ],
        "colorProfile": {
           "primary": ["Hex/Name", ...],
           "secondary": ["Hex/Name", ...],
           "avoid": ["Hex/Name", ...]
        }
      }
    `;

        const result = await withRetry(() => model.generateContent(prompt));
        const responseText = result.response.text();

        console.log('Gemini Style DNA Response:', responseText);

        // Clean markdown if present
        const jsonString = responseText.replace(/```json\n|\n```/g, '').trim();
        let analysis;

        try {
            analysis = JSON.parse(jsonString);
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            throw new Error('Failed to parse AI response');
        }

        return new Response(JSON.stringify(analysis), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in style-dna-analysis:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
