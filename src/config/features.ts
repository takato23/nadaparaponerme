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

  // Try-On hybrid cache pipeline (preview + async HD)
  enableHybridTryOn: boolean;

  // Unified Studio Stylist assistant experience
  enableUnifiedStudioStylist: boolean;

  // Closet-first flow: run AI insights only on-demand
  enableOnDemandClosetAI: boolean;

  // Guided look creation orchestrated by backend workflow
  enableGuidedLookCreationBackend: boolean;
}

// Default feature flags - tuned for local/dev. Production enforcement happens below.
// ⚠️ SECURITY: useSupabaseAI should be TRUE in production to route AI calls through Edge Functions
const defaultFlags: FeatureFlags = {
  useSupabaseAuth: true, // ✅ Enabled - AuthView uses Supabase authentication
  useSupabaseCloset: false, // ✅ Keep local closet in dev until migration is ready
  useSupabaseOutfits: false, // TODO: Enable after migration
  useSupabaseAI: true, // ✅ SECURITY: Must be true - routes AI through Edge Functions (no exposed API key)
  useSupabasePreferences: false,
  autoMigration: false,
  enableHybridTryOn: false,
  enableUnifiedStudioStylist: false,
  enableOnDemandClosetAI: false,
  enableGuidedLookCreationBackend: false,
};

const enforceProductionFlags = (flags: FeatureFlags): FeatureFlags => {
  if (!import.meta.env.PROD) return flags;
  return {
    ...flags,
    useSupabaseAuth: true,
    useSupabaseAI: true,
    useSupabaseCloset: true,
  };
};

// Load flags from localStorage, falling back to defaults
const loadFlags = (): FeatureFlags => {
  try {
    const stored = localStorage.getItem('ojodeloca-feature-flags');
    if (stored) {
      const parsed = JSON.parse(stored);
      return enforceProductionFlags({ ...defaultFlags, ...parsed });
    }
  } catch (error) {
    console.error('Failed to load feature flags:', error);
  }
  return enforceProductionFlags(defaultFlags);
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
  currentFlags = enforceProductionFlags({ ...currentFlags, ...flags });
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
  currentFlags = enforceProductionFlags({ ...defaultFlags });
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
    enableHybridTryOn: true,
    enableUnifiedStudioStylist: true,
    enableOnDemandClosetAI: true,
    enableGuidedLookCreationBackend: true,
  });
};
