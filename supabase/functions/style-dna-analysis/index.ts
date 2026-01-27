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
        // Using 2.0 Flash for faster response with better quality
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.8, // More creative but still coherent
            }
        });

        // Prepare detailed closet analysis
        const categoryBreakdown = closet.reduce((acc: Record<string, number>, item: SimplifiedItem) => {
            const cat = item.metadata?.category || 'unknown';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});

        const colorBreakdown = closet.reduce((acc: Record<string, number>, item: SimplifiedItem) => {
            const color = item.metadata?.color_primary || 'unknown';
            acc[color] = (acc[color] || 0) + 1;
            return acc;
        }, {});

        const vibeBreakdown: Record<string, number> = {};
        closet.forEach((item: SimplifiedItem) => {
            (item.metadata?.vibe_tags || []).forEach(vibe => {
                vibeBreakdown[vibe] = (vibeBreakdown[vibe] || 0) + 1;
            });
        });

        // Prepare condensed closet summary with rich context
        const closetSummary = closet.map((item: SimplifiedItem) => {
            const meta = item.metadata || {};
            const vibes = (meta.vibe_tags || []).join(', ');
            const seasons = (meta.seasons || []).join(', ');
            return `ID:${item.id} | ${meta.category}/${meta.subcategory || 'Generic'} | Color: ${meta.color_primary || 'Unknown'} | Vibes: ${vibes} | Seasons: ${seasons}`;
        }).join('\n');

        const prompt = `
You are an ELITE Fashion Psychologist & Style DNA Analyst with expertise in:
- Fashion Psychology & Semiotics
- Style Archetype Theory
- Color Theory & Psychology
- Personality Assessment through Fashion Choices
- Contemporary Fashion Trends & Celebrity Styling

You're analyzing a person's complete wardrobe to create their "Style DNA Profile" - a deep, multi-dimensional analysis of their fashion identity, personality expression, and aesthetic preferences.

═══════════════════════════════════════════════════════════════════

📊 WARDROBE STATISTICS:
Total Items: ${closet.length}
Category Breakdown: ${JSON.stringify(categoryBreakdown, null, 2)}
Color Distribution: ${JSON.stringify(colorBreakdown, null, 2)}
Vibe Tag Frequency: ${JSON.stringify(vibeBreakdown, null, 2)}

═══════════════════════════════════════════════════════════════════

🔍 DETAILED INVENTORY:
${closetSummary}

═══════════════════════════════════════════════════════════════════

🎯 YOUR ANALYSIS MISSION:

You must produce a DEEPLY INSIGHTFUL, SPECIFIC, and PERSONALIZED Style DNA profile. 

CRITICAL QUALITY STANDARDS:
❌ NO GENERIC STATEMENTS like "versatile wardrobe" or "unique style"
❌ NO VAGUE HOROSCOPE-LIKE DESCRIPTIONS
✅ CITE SPECIFIC ITEMS (using IDs) as evidence
✅ IDENTIFY CONCRETE PATTERNS (e.g., "70% of bottoms are black denim")
✅ MAKE BOLD, SPECIFIC PERSONALITY INFERENCES backed by fashion psychology
✅ USE REAL CELEBRITY NAMES (modern, relevant, diverse)
✅ PROVIDE ACTIONABLE EVOLUTION INSIGHTS

═══════════════════════════════════════════════════════════════════

📐 REQUIRED JSON STRUCTURE:

{
  "primary_archetype": "string - MUST be one of: casual, formal, sporty, bohemian, minimalist, edgy, classic, trendy, romantic, preppy",
  "secondary_archetype": "string - Different from primary, from the same enum",
  
  "archetypes": [
    {
      "archetype": "string - One of the 10 enums above",
      "percentage": number (0-100, must sum to ~100 across all archetypes),
      "description": "string - 2-3 sentences explaining WHY this archetype fits. Reference SPECIFIC items (e.g., 'Your 5 oversized hoodies (ID:123, ID:456...) and relaxed jeans show a clear casual comfort preference.')",
      "key_items": ["ID1", "ID2", "ID3"] - Array of 2-3 actual Item IDs from inventory that best exemplify this archetype
    }
    // Include ALL 10 archetypes, even if some are 0%
  ],
  
  "versatility_score": number (0-100) - Based on: variety of categories, color range, vibe diversity, cross-occasion flexibility. Be HARSH - most people are 40-70.
  
  "uniqueness_score": number (0-100) - How distinctive vs mainstream? Assess: unusual color combos, niche vibes, rare items, unconventional pairings. Most people: 30-60.
  
  "confidence_level": "low" | "medium" | "high" - Based on closet size: <15 items = low, 15-30 = medium, 30+ = high,
  
  "summary": "string - 3-4 paragraphs (min 300 words) of NARRATIVE STORYTELLING. Paint a vivid picture:
    Paragraph 1: Their dominant style identity & what it says about them
    Paragraph 2: Deeper personality insights - What are they REALLY communicating through fashion?
    Paragraph 3: Their style strengths & signature moves
    Paragraph 4: Growth edges & untapped potential
    
    USE SPECIFIC EVIDENCE. Example: 'Your collection of 8 black items suggests a minimalist aesthetic, but the 3 bold patterned pieces hint at a hidden maximalist waiting to emerge.'",
  
  "color_profile": {
    "dominant_colors": [
      {
        "name": "string - Color name",
        "hex": "#RRGGBB - Actual hex code",
        "percentage": number - % of total wardrobe
      }
      // Top 5-7 colors, sorted by frequency
    ],
    "color_temperature": "warm" | "cool" | "neutral" | "mixed" - Based on color analysis,
    "color_boldness": "vibrant" | "muted" | "mixed" - Are colors saturated or desaturated?,
    "favorite_neutrals": ["black", "white", "gray", "beige", "navy"] - List actual neutrals from their wardrobe,
    "accent_colors": ["red", "yellow"] - Non-neutral colors they use strategically
  },
  
  "silhouette_preferences": [
    {
      "type": "oversized" | "fitted" | "structured" | "flowy" | "tailored" | "relaxed",
      "percentage": number (0-100),
      "description": "string - Explain with examples. E.g., 'Your 12 oversized tops (IDs: X, Y, Z) show you prioritize comfort over traditional fit.'"
    }
    // Include top 4-5 silhouettes
  ],
  
  "personality_traits": [
    {
      "trait": "string - e.g., 'Adventurous', 'Pragmatic', 'Expressive', 'Detail-Oriented'",
      "score": number (1-10) - How strongly this trait shows in wardrobe,
      "reasoning": "string - 2-3 sentences with SPECIFIC EVIDENCE from wardrobe. Example: 'Score 8/10 for Adventurousness: Your 4 statement jackets and 6 bold prints show willingness to take fashion risks. However, the abundance of safe basics suggests you still crave balance.'"
    }
    // 5-7 diverse personality traits
  ],
  
  "celebrity_matches": [
    {
      "name": "string - REAL celebrity/influencer name (modern, relevant, diverse representation)",
      "match_percentage": number (60-95) - Be realistic, perfect matches are rare,
      "reasoning": "string - 2-3 sentences explaining the match. Reference their known style. E.g., 'Like Zendaya, you balance high-fashion pieces with streetwear basics, showing versatility across contexts.'",
      "shared_characteristics": ["Characteristic 1", "Characteristic 2", "Characteristic 3"] - Specific style traits in common
    }
    // Top 3-5 celebrity matches, MUST be real people
  ],
  
  "occasion_breakdown": [
    {
      "occasion": "casual" | "work" | "formal" | "athletic" | "party",
      "percentage": number - % of wardrobe suited for this,
      "item_count": number,
      "typical_items": ["ID1", "ID2", "ID3"] - Sample Item IDs for this occasion
    }
    // All relevant occasions
  ],
  
  "style_evolution_insights": [
    {
      "trend": "string - e.g., 'Moving towards minimalism', 'Embracing color', 'Exploring streetwear'",
      "evidence": "string - What in their wardrobe suggests this? Be specific.",
      "recommendation": "string - Concrete next step. E.g., 'Try adding 2-3 mid-toned blazers to bridge your casual and formal pieces.'"
    }
    // 3-5 insights about their style journey & growth opportunities
  ]
}

═══════════════════════════════════════════════════════════════════

🎨 STYLE ARCHETYPE DEFINITIONS (for accurate classification):

1. CASUAL - Relaxed, comfort-first, everyday wear. Jeans, tees, hoodies, sneakers.
2. FORMAL - Structured, professional, occasion-appropriate. Suits, blazers, dress shoes.
3. SPORTY - Athletic-inspired, functional, active. Joggers, sneakers, performance fabrics.
4. BOHEMIAN - Free-spirited, eclectic, artistic. Flowy silhouettes, patterns, natural fabrics.
5. MINIMALIST - Refined simplicity, neutral palette, quality basics. Less is more.
6. EDGY - Bold, unconventional, statement-making. Leather, hardware, dark colors.
7. CLASSIC - Timeless, traditional, preppy. Tailored pieces, heritage brands, safe choices.
8. TRENDY - Fashion-forward, current, social-media-inspired. Latest styles, viral pieces.
9. ROMANTIC - Soft, feminine/elegant, delicate. Lace, florals, pastels, vintage touches.
10. PREPPY - Polished, collegiate, All-American. Polos, chinos, loafers, stripes.

═══════════════════════════════════════════════════════════════════

🧠 FASHION PSYCHOLOGY FRAMEWORK:

Consider what clothing choices reveal about:
- Risk tolerance (bold vs safe choices)
- Social orientation (trend-following vs independent)
- Self-expression needs (loud vs subtle)
- Comfort priorities (function vs form)
- Identity investment (fashion-as-identity vs utilitarian)
- Emotional relationship with clothing (joy, armor, expression, practicality)

═══════════════════════════════════════════════════════════════════

⚠️ CRITICAL REMINDERS:

1. Use ACTUAL ITEM IDs from the inventory for key_items and typical_items
2. Make percentages REALISTIC - not everyone is "versatile" or "unique"
3. Celebrity matches must be REAL, MODERN, and SPECIFIC (not generic icons)
4. Summary must be NARRATIVE and PERSONAL, not a list of observations
5. Every claim should be backed by specific wardrobe evidence
6. Confidence level depends on closet size: ${closet.length} items = ${closet.length < 15 ? 'LOW' : closet.length < 30 ? 'MEDIUM' : 'HIGH'}

═══════════════════════════════════════════════════════════════════

OUTPUT FORMAT: Return ONLY valid JSON. No markdown, no code blocks, no explanations - just the raw JSON object.

Begin analysis now.
`;

        const result = await withRetry(() => model.generateContent(prompt));
        const responseText = result.response.text();

        // Clean markdown if present
        const jsonString = responseText.replace(/```json\n|\n```/g, '').replace(/```/g, '').trim();
        let analysis;

        try {
            analysis = JSON.parse(jsonString);

            // Validation
            if (!analysis.primary_archetype || !analysis.color_profile || !analysis.archetypes) {
                throw new Error('Incomplete JSON structure');
            }

            // Ensure all 10 archetypes are present
            const requiredArchetypes = ['casual', 'formal', 'sporty', 'bohemian', 'minimalist', 'edgy', 'classic', 'trendy', 'romantic', 'preppy'];
            const existingArchetypes = new Set(analysis.archetypes.map((a: any) => a.archetype));
            
            requiredArchetypes.forEach(arch => {
                if (!existingArchetypes.has(arch)) {
                    analysis.archetypes.push({
                        archetype: arch,
                        percentage: 0,
                        description: `No significant ${arch} elements detected in wardrobe.`,
                        key_items: []
                    });
                }
            });

            // Normalize percentages to sum to 100
            const totalPercentage = analysis.archetypes.reduce((sum: number, a: any) => sum + a.percentage, 0);
            if (totalPercentage > 0) {
                analysis.archetypes = analysis.archetypes.map((a: any) => ({
                    ...a,
                    percentage: (a.percentage / totalPercentage) * 100
                }));
            }

        } catch (e) {
            console.error('Failed to parse JSON:', e);
            console.error('Raw response:', responseText);
            throw new Error('Failed to parse AI response. The model might have generated invalid JSON.');
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
