import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0';
import { withRetry } from '../_shared/retry.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

// Interface matching the Frontend Type
interface ClothingItemMetadata {
    category: string;
    subcategory?: string;
    color_primary?: string;
    vibe_tags?: string[];
    seasons?: string[];
}

interface SimplifiedItem {
    id: string;
    metadata: ClothingItemMetadata;
}

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
        // Using 2.0 Flash for faster response
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        // Prepare condensed closet summary to fit context window
        // We focus on visual and stylistic metadata
        const closetSummary = closet.map((item: SimplifiedItem) => {
            const meta = item.metadata || {};
            const vibes = (meta.vibe_tags || []).join(', ');
            return `ID:${item.id} | ${meta.category} (${meta.subcategory || 'Generic'}) | Color: ${meta.color_primary || 'Unknown'} | Vibes: ${vibes}`;
        }).join('\n');

        const prompt = `
      You are an elite Fashion Psycholgist and Stylist AI. Your task is to analyze the following User Wardrobe and generate a "Style DNA Profile".
      
      This is a deep psychological and aesthetic analysis. You must infer the user's personality and style archetypes based on what they own.
      
      --- WARDROBE INVENTORY ---
      ${closetSummary}
      --- END INVENTORY ---

      Analyze the data and output a strictly valid JSON object. Do not include markdown code blocks, just the raw JSON.
      
      REQUIRED JSON STRUCTURE:
      {
        "primary_archetype": "string (one of: casual, formal, sporty, bohemian, minimalist, edgy, classic, trendy, romantic, preppy)",
        "secondary_archetype": "string (different from primary)",
        "archetypes": [
           { 
             "archetype": "string (must be one of the enums above)", 
             "percentage": number (0-100), 
             "description": "Why this fits the user based on specific items",
             "key_items": ["ID1", "ID2"] (Up to 3 distinct IDs from inventory that justify this)
           }
        ],
        "versatility_score": number (0-100),
        "uniqueness_score": number (0-100),
        "confidence_level": "string ('low' | 'medium' | 'high' depending on closet size/variety)",
        "summary": "string (2-3 paragraphs deep narrative about their style)",
        "color_profile": {
           "dominant_colors": [ { "name": "string", "hex": "#RRGGBB", "percentage": number } ],
           "color_temperature": "string ('warm' | 'cool' | 'neutral' | 'mixed')",
           "color_boldness": "string ('vibrant' | 'muted' | 'mixed')",
           "favorite_neutrals": ["string"],
           "accent_colors": ["string"]
        },
        "silhouette_preferences": [
           { "type": "string (oversized, fitted, structured, flowy, tailored, relaxed)", "percentage": number, "description": "string" }
        ],
        "personality_traits": [
           { "trait": "string", "score": number (1-10), "reasoning": "string" }
        ],
        "celebrity_matches": [
           { "name": "string", "match_percentage": number, "reasoning": "string", "shared_characteristics": ["string"] }
        ],
        "occasion_breakdown": [
            { "occasion": "string", "percentage": number, "item_count": number, "typical_items": ["ID1"] }
        ],
        "style_evolution_insights": [
           { "trend": "string", "evidence": "string", "recommendation": "string" }
        ]
      }
      
      CRITICAL RULES:
      1. Ensure all percentages in 'archetypes' sum to approx 100% (or just show top ones).
      2. 'primary_archetype' must be the one with the highest percentage.
      3. Use real Item IDs from the input list for 'key_items'.
      4. Be specific in 'description' and 'reasoning'. Avoid generic horoscope-like text.
    `;

        const result = await withRetry(() => model.generateContent(prompt));
        const responseText = result.response.text();

        // Clean markdown if present
        const jsonString = responseText.replace(/```json\n|\n```/g, '').replace(/```/g, '').trim();
        let analysis;

        try {
            analysis = JSON.parse(jsonString);

            // Basic validation
            if (!analysis.primary_archetype || !analysis.color_profile) {
                throw new Error('Incomplete JSON structure');
            }
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            console.error('Raw response:', responseText);
            throw new Error('Failed to parse AI response. The model might have hallucinated invalid JSON.');
        }

        // Add metadata
        analysis.created_at = new Date().toISOString();
        analysis.analyzed_items_count = closet.length;

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
