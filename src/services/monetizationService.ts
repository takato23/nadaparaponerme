import { ClothingItem } from '../types';

// Feature Flags Keys
export const MONETIZATION_FLAGS = {
    ENABLE_SHARE_REWARD: 'ojodeloca_enable_share_reward',
    ENABLE_WATERMARK: 'ojodeloca_enable_watermark',
    ENABLE_AFFILIATES: 'ojodeloca_enable_affiliates',
};

// Default Values
const DEFAULT_FLAGS = {
    [MONETIZATION_FLAGS.ENABLE_SHARE_REWARD]: true,
    [MONETIZATION_FLAGS.ENABLE_WATERMARK]: true,
    [MONETIZATION_FLAGS.ENABLE_AFFILIATES]: true,
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
