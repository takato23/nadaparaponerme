/**
 * Feature Flags Configuration
 *
 * Controls which features use Supabase backend vs localStorage.
 * Allows gradual migration and instant rollback if needed.
 */

export interface FeatureFlags {
  // Phase 1: Authentication
  useSupabaseAuth: boolean;

  // Phase 2: Closet Items
  useSupabaseCloset: boolean;

  // Phase 3: Saved Outfits
  useSupabaseOutfits: boolean;

  // Phase 4: AI Services via Edge Functions
  useSupabaseAI: boolean;

  // Phase 5: User Preferences
  useSupabasePreferences: boolean;

  // Migration
  autoMigration: boolean;
}

// Default feature flags - Supabase enabled for production use
// In development, useSupabaseAI can be disabled if VITE_GEMINI_API_KEY is available
const defaultFlags: FeatureFlags = {
  useSupabaseAuth: true,
  useSupabaseCloset: true,
  useSupabaseOutfits: true,
  useSupabaseAI: true, // Always use Edge Functions for production readiness
  useSupabasePreferences: true,
  autoMigration: true,
};

// Load flags from localStorage, falling back to defaults
const loadFlags = (): FeatureFlags => {
  try {
    const stored = localStorage.getItem('ojodeloca-feature-flags');
    if (stored) {
      return { ...defaultFlags, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load feature flags:', error);
  }
  return defaultFlags;
};

// Save flags to localStorage
const saveFlags = (flags: FeatureFlags): void => {
  try {
    localStorage.setItem('ojodeloca-feature-flags', JSON.stringify(flags));
  } catch (error) {
    console.error('Failed to save feature flags:', error);
  }
};

// Current feature flags
let currentFlags: FeatureFlags = loadFlags();

/**
 * Get all feature flags
 */
export const getFeatureFlags = (): FeatureFlags => {
  return { ...currentFlags };
};

/**
 * Get a specific feature flag
 */
export const getFeatureFlag = (flag: keyof FeatureFlags): boolean => {
  return currentFlags[flag];
};

/**
 * Update feature flags
 */
export const setFeatureFlags = (flags: Partial<FeatureFlags>): void => {
  currentFlags = { ...currentFlags, ...flags };
  saveFlags(currentFlags);
};

/**
 * Enable a specific feature
 */
export const enableFeature = (flag: keyof FeatureFlags): void => {
  setFeatureFlags({ [flag]: true });
};

/**
 * Disable a specific feature
 */
export const disableFeature = (flag: keyof FeatureFlags): void => {
  setFeatureFlags({ [flag]: false });
};

/**
 * Reset all flags to defaults (useful for rollback)
 */
export const resetFeatureFlags = (): void => {
  currentFlags = { ...defaultFlags };
  saveFlags(currentFlags);
};

/**
 * Enable all features (full Supabase mode)
 */
export const enableAllFeatures = (): void => {
  setFeatureFlags({
    useSupabaseAuth: true,
    useSupabaseCloset: true,
    useSupabaseOutfits: true,
    useSupabaseAI: true,
    useSupabasePreferences: true,
    autoMigration: true,
  });
};
