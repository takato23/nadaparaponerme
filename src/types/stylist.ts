
export type BodyShape = 'hourglass' | 'triangle' | 'inverted_triangle' | 'rectangle' | 'oval';

export type ColorSeason =
    | 'spring_light' | 'spring_warm' | 'spring_bright'
    | 'summer_light' | 'summer_cool' | 'summer_soft'
    | 'autumn_warm' | 'autumn_soft' | 'autumn_deep'
    | 'winter_cool' | 'winter_deep' | 'winter_bright';

export type FormalityLevel = 1 | 2 | 3 | 4 | 5;

export interface StylistProfile {
    id: string;
    user_id: string;
    body_shape: BodyShape;
    color_season: ColorSeason;
    height_cm?: number;
    weight_kg?: number;
    style_archetypes?: string[];
    preferences: {
        loves: string[];
        hates: string[];
    };
}

export interface FashionItem {
    id: string;
    category: 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessory' | 'one_piece';
    sub_category: string;
    colors: string[];
    pattern: 'solid' | 'striped' | 'floral' | 'checked' | 'animal' | 'other';
    material?: string;
    formality: FormalityLevel;
    fit: 'oversize' | 'slim' | 'regular' | 'tight' | 'loose';
    season_tags: string[];
}

export interface OutfitRecommendation {
    outfit_title: string;
    items: FashionItem[];
    explanation: {
        body_shape_reason: string;
        color_reason: string;
        mood_reason: string;
    };
    ui_metadata: {
        mood_color_hex: string;
        vibe: string;
    };
}
