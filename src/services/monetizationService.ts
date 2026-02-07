import { ClothingItem } from '../../types';

// Feature Flags Keys
export const MONETIZATION_FLAGS = {
    ENABLE_SHARE_REWARD: 'ojodeloca_enable_share_reward',
    ENABLE_WATERMARK: 'ojodeloca_enable_watermark',
    ENABLE_AFFILIATES: 'ojodeloca_enable_affiliates',
    ENABLE_SPONSORED_PLACEMENTS: 'ojodeloca_enable_sponsored_placements',
};

// Default Values
const DEFAULT_FLAGS = {
    [MONETIZATION_FLAGS.ENABLE_SHARE_REWARD]: true,
    [MONETIZATION_FLAGS.ENABLE_WATERMARK]: true,
    [MONETIZATION_FLAGS.ENABLE_AFFILIATES]: true,
    [MONETIZATION_FLAGS.ENABLE_SPONSORED_PLACEMENTS]: true,
};

/**
 * Get the status of a monetization feature flag
 */
export function getFeatureFlag(key: string): boolean {
    if (typeof window === 'undefined') return DEFAULT_FLAGS[key] ?? false;

    const stored = localStorage.getItem(key);
    if (stored === null) {
        return DEFAULT_FLAGS[key] ?? false;
    }

    return stored === 'true';
}

/**
 * Set the status of a monetization feature flag
 */
export function setFeatureFlag(key: string, value: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, String(value));
}

/**
 * Generate an affiliate link for a clothing item
 * In a real app, this would call an API to find similar products
 */
export function getAffiliateLink(item: ClothingItem): string | null {
    if (!getFeatureFlag(MONETIZATION_FLAGS.ENABLE_AFFILIATES)) return null;

    // Mock affiliate logic based on item metadata
    const searchTerm = encodeURIComponent(`${item.metadata.subcategory} ${item.metadata.color_primary} mujer`);

    // Example: Redirect to Amazon search with affiliate tag
    // In production, replace 'tag=ojodeloca-20' with your actual affiliate ID
    return `https://www.amazon.com/s?k=${searchTerm}&tag=ojodeloca-20`;
}

/**
 * Check if watermark should be shown
 */
export function shouldShowWatermark(isPremium: boolean): boolean {
    if (isPremium) return false; // Never show for premium
    return getFeatureFlag(MONETIZATION_FLAGS.ENABLE_WATERMARK);
}

/**
 * Shopping platform configuration
 */
export type ShoppingPlatform = 'amazon' | 'mercadolibre' | 'google';

export interface ShoppingLink {
    platform: ShoppingPlatform;
    name: string;
    url: string;
    icon: string; // Material icon name
}

export interface SponsoredPlacement {
    id: string;
    name: string;
    url: string;
    icon: string;
    description: string;
    cta: string;
    matchTags?: string[];
    priority?: number;
}

const AFFILIATE_TAGS: Partial<Record<ShoppingPlatform, string>> = {
    amazon: 'ojodeloca-20',
};

const SPONSORED_PLACEMENTS: SponsoredPlacement[] = [
    {
        id: 'sponsored-zara',
        name: 'Zara',
        url: 'https://www.zara.com/ar/',
        icon: 'storefront',
        description: 'Basicos nuevos y colecciones de temporada.',
        cta: 'Ver novedades',
        matchTags: ['top', 'bottom', 'shoes', 'outerwear', 'formal', 'casual'],
        priority: 6,
    },
    {
        id: 'sponsored-hm',
        name: 'H&M',
        url: 'https://www2.hm.com/es_ar/',
        icon: 'local_mall',
        description: 'Looks completos con precios accesibles.',
        cta: 'Explorar catalogo',
        matchTags: ['top', 'bottom', 'casual', 'street', 'basic'],
        priority: 5,
    },
    {
        id: 'sponsored-mango',
        name: 'Mango',
        url: 'https://shop.mango.com/ar',
        icon: 'shopping_bag',
        description: 'Opciones premium para elevar el look.',
        cta: 'Comprar ahora',
        matchTags: ['formal', 'night', 'elegant', 'outerwear'],
        priority: 4,
    },
    {
        id: 'sponsored-nike',
        name: 'Nike',
        url: 'https://www.nike.com/ar/',
        icon: 'sports_tennis',
        description: 'Zapatillas y athleisure para outfits urbanos.',
        cta: 'Ver sneakers',
        matchTags: ['shoes', 'sport', 'street', 'active'],
        priority: 5,
    },
];

/**
 * Generate shopping search links for a clothing item description
 * Links are search URLs with optional affiliate tags
 *
 * @param searchTerm - Description of the item to search (e.g. "remera blanca básica")
 * @returns Array of shopping links for different platforms
 */
export function getShoppingLinks(searchTerm: string): ShoppingLink[] {
    if (!getFeatureFlag(MONETIZATION_FLAGS.ENABLE_AFFILIATES)) return [];

    const encodedTerm = encodeURIComponent(searchTerm);
    const mlTerm = searchTerm.replace(/ /g, '-'); // MercadoLibre uses dashes
    const amazonTag = AFFILIATE_TAGS.amazon ? `&tag=${AFFILIATE_TAGS.amazon}` : '';

    return [
        {
            platform: 'mercadolibre',
            name: 'Mercado Libre',
            url: `https://listado.mercadolibre.com.ar/${encodeURIComponent(mlTerm)}`,
            icon: 'storefront'
        },
        {
            platform: 'amazon',
            name: 'Amazon',
            url: `https://www.amazon.com/s?k=${encodedTerm}${amazonTag}`,
            // Para agregar afiliados después: &tag=TU-TAG-20
            icon: 'shopping_cart'
        },
        {
            platform: 'google',
            name: 'Google Shopping',
            url: `https://www.google.com/search?tbm=shop&q=${encodedTerm}`,
            icon: 'search'
        }
    ];
}

/**
 * Build a search term from clothing item metadata
 */
export function buildSearchTermFromItem(item: ClothingItem): string {
    const { subcategory, color_primary, vibe_tags } = item.metadata;

    // Build descriptive search term
    const parts = [
        color_primary,
        subcategory,
        vibe_tags?.[0] // Add first vibe tag if exists
    ].filter(Boolean);

    return parts.join(' ') + ' mujer'; // Add "mujer" for women's fashion context
}

/**
 * Build a search term for a full look from multiple items
 */
export function buildLookSearchTerm(items: ClothingItem[]): string {
    const normalized = items
        .map((item) => item.metadata.subcategory)
        .filter(Boolean)
        .slice(0, 3)
        .join(' ');

    return `${normalized} outfit mujer`.trim();
}

// ============================================================================
// SUPABASE-BACKED SPONSORS SYSTEM
// ============================================================================

import { supabase } from '../lib/supabase';

// DB-backed sponsor type (matches Supabase schema)
export interface DBSponsor {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    website_url: string;
    icon: string;
    description: string;
    cta_text: string;
    match_categories: string[];
    match_vibes: string[];
    match_colors: string[];
    priority: number;
    is_active: boolean;
}

// Cache for sponsors (TTL: 5 minutes)
let sponsorsCache: SponsoredPlacement[] | null = null;
let sponsorsCacheTime: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Convert DB sponsor to SponsoredPlacement format
 */
function dbSponsorToPlacement(sponsor: DBSponsor): SponsoredPlacement {
    return {
        id: sponsor.id,
        name: sponsor.name,
        url: sponsor.website_url,
        icon: sponsor.icon,
        description: sponsor.description,
        cta: sponsor.cta_text,
        matchTags: [...sponsor.match_categories, ...sponsor.match_vibes, ...sponsor.match_colors],
        priority: sponsor.priority,
    };
}

/**
 * Fetch sponsors from Supabase (with caching)
 */
export async function fetchSponsorsFromDB(): Promise<SponsoredPlacement[]> {
    // Check cache first
    if (sponsorsCache && Date.now() - sponsorsCacheTime < CACHE_TTL_MS) {
        return sponsorsCache;
    }

    try {
        const { data, error } = await supabase
            .from('sponsors')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: false });

        if (error) {
            console.error('[Sponsors] DB fetch error:', error);
            return SPONSORED_PLACEMENTS; // Fallback to hardcoded
        }

        if (!data || data.length === 0) {
            console.warn('[Sponsors] No active sponsors in DB, using fallback');
            return SPONSORED_PLACEMENTS;
        }

        // Convert and cache
        sponsorsCache = data.map(dbSponsorToPlacement);
        sponsorsCacheTime = Date.now();
        return sponsorsCache;

    } catch (err) {
        console.error('[Sponsors] Unexpected error:', err);
        return SPONSORED_PLACEMENTS; // Fallback to hardcoded
    }
}

/**
 * Track a sponsor click for analytics
 */
export async function trackSponsorClick(
    sponsorId: string,
    context: 'dupe_finder' | 'outfit_result' | 'shop_the_look' | 'fit_result' | 'shopping_gap',
    metadata?: { itemCategory?: string; searchTerm?: string }
): Promise<void> {
    try {
        // Get current user (might be null for anonymous)
        const { data: { user } } = await supabase.auth.getUser();

        // Note: Type assertion needed until migration is applied and types are regenerated
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('sponsor_clicks') as any).insert({
            sponsor_id: sponsorId,
            user_id: user?.id || null,
            placement_context: context,
            item_category: metadata?.itemCategory || null,
            search_term: metadata?.searchTerm || null,
        });

    } catch (err) {
        // Silently fail - tracking shouldn't break the app
        console.warn('[Sponsors] Click tracking failed:', err);
    }
}

/**
 * Return sponsored placements based on item metadata or search term
 * Now fetches from DB with fallback to hardcoded
 */
export function getSponsoredPlacements(
    searchTerm: string,
    item?: ClothingItem,
    limit = 2
): SponsoredPlacement[] {
    if (!getFeatureFlag(MONETIZATION_FLAGS.ENABLE_SPONSORED_PLACEMENTS)) return [];

    // Use cached sponsors or fallback to hardcoded
    const sponsors = sponsorsCache || SPONSORED_PLACEMENTS;

    const tokens = new Set(
        searchTerm
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean)
    );

    if (item) {
        tokens.add(item.metadata.category.toLowerCase());
        tokens.add(item.metadata.subcategory.toLowerCase());
        item.metadata.vibe_tags.forEach((tag) => tokens.add(tag.toLowerCase()));
    }

    const scored = sponsors.map((placement) => {
        const matches = placement.matchTags?.filter((tag) => tokens.has(tag.toLowerCase())).length ?? 0;
        const score = (placement.priority ?? 0) + matches * 2;
        return { placement, score };
    })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ placement }) => placement);

    const fallback = [...sponsors].sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );

    const placements = scored.length > 0 ? scored : fallback;
    return placements.slice(0, limit);
}

/**
 * Async version of getSponsoredPlacements that fetches from DB first
 */
export async function getSponsoredPlacementsAsync(
    searchTerm: string,
    item?: ClothingItem,
    limit = 2
): Promise<SponsoredPlacement[]> {
    if (!getFeatureFlag(MONETIZATION_FLAGS.ENABLE_SPONSORED_PLACEMENTS)) return [];

    // Fetch from DB (uses cache if available)
    await fetchSponsorsFromDB();

    // Now use the sync version which will use cached data
    return getSponsoredPlacements(searchTerm, item, limit);
}

/**
 * Invalidate sponsors cache (call when sponsors are updated)
 */
export function invalidateSponsorsCache(): void {
    sponsorsCache = null;
    sponsorsCacheTime = 0;
}

