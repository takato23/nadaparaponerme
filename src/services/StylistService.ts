import { BodyShape, ColorSeason, FashionItem, FormalityLevel, StylistProfile, OutfitRecommendation } from '../types/stylist';

class StylistService {

    // --- KNOWLEDGE BASE: MEMORY ---

    private rules = {
        color_seasons: {
            spring_light: { base: ['beige', 'camel'], accents: ['peach', 'light_green'] },
            winter_deep: { base: ['black', 'charcoal'], accents: ['emerald', 'royal_blue', 'red'] },
            // ... (We would expand this with valid data for all 12 seasons)
        },
        body_shapes: {
            hourglass: {
                strategy: "Follow natural line, accentuate waist.",
                recommended_fits: ['slim', 'regular'],
                avoid: ['oversize_shapeless']
            },
            triangle: {
                strategy: "Attract attention upwards.",
                recommended_tops: ['structured_shoulders', 'bright_colors'],
                recommended_bottoms: ['dark_colors', 'straight_cut']
            },
            inverted_triangle: {
                strategy: "Soften shoulders, add volume downwards.",
                recommended_tops: ['v_neck', 'raglan'],
                recommended_bottoms: ['light_colors', 'flared']
            },
            rectangle: {
                strategy: "Create illusion of waist.",
                recommended_techniques: ['belts', 'wrap_cuts']
            },
            oval: {
                strategy: "Elongate silhouette.",
                recommended_techniques: ['vertical_lines', 'monochrome']
            }
        }
    };

    /**
     * Main generation algorithm: "Chain of Thought"
     */
    public generateOutfit(
        profile: StylistProfile,
        wardrobe: FashionItem[],
        occasion: { type: string, formality: FormalityLevel },
        weather: { temp: number, isRaining: boolean }
    ): OutfitRecommendation {

        // 1. FILTER: Hard Filters (Hates, Weather, Formality)
        let candidates = wardrobe.filter(item => {
            // Filter 'hates'
            if (profile.preferences.hates.some(hate => item.sub_category.includes(hate))) return false;

            // Filter Weather
            if (weather.temp < 15 && (item.sub_category === 'shorts' || item.sub_category === 'tank_top')) return false;
            if (weather.temp > 25 && (item.material === 'wool' || item.material === 'leather')) return false; // Assuming material exists or implied

            // Filter Formality (allow +/- 1 variance generally, but strict for extremes)
            if (Math.abs(item.formality - occasion.formality) > 1) return false;

            return true;
        });

        // 2. SELECTION: Base Piece (Bottom or One-Piece)
        const bottoms = candidates.filter(i => i.category === 'bottom' || i.category === 'one_piece');
        if (bottoms.length === 0) throw new Error("No suitable bottoms found for this occasion.");

        // Heuristic: Select best bottom for Body Shape
        const selectedBottom = this.selectBestItemForShape(bottoms, profile.body_shape, 'bottom');

        // 3. CONSTRUCTION: Complementary Pieces
        let outfitItems: FashionItem[] = [selectedBottom];
        let selectedTop: FashionItem | undefined;

        if (selectedBottom.category !== 'one_piece') {
            const tops = candidates.filter(i => i.category === 'top');
            // Heuristic: Select top that matches bottom color/style and fits Body Shape
            selectedTop = this.selectBestItemForShape(tops, profile.body_shape, 'top');
            if (selectedTop) outfitItems.push(selectedTop);
        }

        // 4. CLOSURE: Shoes & Layers
        // (Simplified for MVP)
        const shoes = candidates.filter(i => i.category === 'shoes');
        if (shoes.length > 0) outfitItems.push(shoes[0]);


        // 5. EXPLANATION GENERATION
        return {
            outfit_title: `Look ${occasion.type} ${profile.style_archetypes?.[0] || 'Personalizado'}`, // style_archetypes needs to be added to profile interface if used
            items: outfitItems,
            explanation: {
                body_shape_reason: this.getExplanationForShape(profile.body_shape, selectedBottom, selectedTop),
                color_reason: "Selected colors harmonize with your " + profile.color_season + " palette.",
                mood_reason: `Perfect for ${occasion.type} given the ${weather.temp}°C weather.`
            },
            ui_metadata: {
                mood_color_hex: "#2A4B7C", // Dynamic logic would go here
                vibe: "Elegant & Comfy"
            }
        };
    }

    private selectBestItemForShape(items: FashionItem[], shape: BodyShape, type: 'top' | 'bottom'): FashionItem {
        // Logic to score items based on shape rules
        // For now, return random valid item or first
        // In real implementation: checks attributes like 'high_waist', 'v_neck' against shape rules
        return items[0];
    }

    private getExplanationForShape(shape: BodyShape, bottom: FashionItem, top?: FashionItem): string {
        const strategy = this.rules.body_shapes[shape].strategy;
        return `For your ${shape} shape, we followed the strategy: "${strategy}".`;
    }
}

export const stylistService = new StylistService();
