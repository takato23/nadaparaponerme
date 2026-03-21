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

  // Shopping assistant V2 hybrid pipeline
  enableShoppingAssistantV2: boolean;

  // Verify product links before presenting recommendations
  enableShoppingLinkVerification: boolean;

  // Route shopping searches by user country/locale
  enableShoppingGeoRouting: boolean;

  // Timeline publishing from item/outfit detail
  enableTimelinePublishing: boolean;

  // Save/wish from activity feed cards
  enableActivitySaveToCloset: boolean;

  // Imported social items stay linked to original source
  enableLinkedSourceItems: boolean;

  // Threaded comments in social activity
  enableSocialCommentsThreaded: boolean;

  // In-app social notifications center
  enableSocialNotificationsCenter: boolean;

  // Followers graph (asymmetric) for social discovery/feed
  enableFollowersGraph: boolean;

  // Report/block moderation controls in social surfaces
  enableSocialModeration: boolean;

  // Chat can suggest + confirm a recommended owned item in wardrobe
  enableChatWardrobeRecommendations: boolean;

  // Show looks-first upload entry in Looks surfaces
  enableLooksFirstUpload: boolean;

  // Allow analyze-look flow for uploaded outfits
  enableAnalyzeLookEntry: boolean;

  // Seed Kumbi with a visual reference when entering from inferred looks
  enableKumbiReferenceLookSeeding: boolean;

  // Allow extra UI actions returned by Kumbi inside Studio panel
  enableStudioKumbiActions: boolean;

  // Allow Kumbi to extract garments from a full-look photo inside chat
  enableKumbiLookExtraction: boolean;
}

const FEATURE_FLAGS_STORAGE_KEY = 'ojodeloca-feature-flags';
export const FEATURE_FLAGS_UPDATED_EVENT = 'ojodeloca-feature-flags-updated';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'key'>;

const getFeatureFlagStorage = (): StorageLike | null => {
  if (typeof window === 'undefined') return null;
  const candidate = window.localStorage;
  if (!candidate) return null;
  if (typeof candidate.getItem !== 'function' || typeof candidate.setItem !== 'function' || typeof candidate.key !== 'function') {
    return null;
  }
  return candidate;
};

const getStableRolloutBucket = (storageKey: string): number => {
  const storage = getFeatureFlagStorage();
  if (!storage) return 0;

  const existing = storage.getItem(storageKey);
  const parsed = Number(existing);
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 99) {
    return Math.floor(parsed);
  }

  const bucket = Math.floor(Math.random() * 100);
  storage.setItem(storageKey, String(bucket));
  return bucket;
};

const isShoppingAssistantV2EnabledInProd = (): boolean => {
  if (!import.meta.env.PROD) return true;

  const forceOn = String(import.meta.env.VITE_SHOPPING_ASSISTANT_V2_FORCE_ON || '').toLowerCase() === 'true';
  if (forceOn) return true;

  const rolloutRaw = Number(import.meta.env.VITE_SHOPPING_ASSISTANT_V2_ROLLOUT || 0);
  const rollout = Number.isFinite(rolloutRaw) ? Math.max(0, Math.min(100, Math.floor(rolloutRaw))) : 0;
  if (rollout >= 100) return true;
  if (rollout <= 0) return false;
  return getStableRolloutBucket('ojodeloca-shopping-v2-rollout-bucket') < rollout;
};

const isChatWardrobeRecommendationsEnabledInProd = (): boolean => {
  if (!import.meta.env.PROD) return true;

  const forceOn = String(import.meta.env.VITE_CHAT_WARDROBE_RECOMMENDATIONS_FORCE_ON || '').toLowerCase() === 'true';
  if (forceOn) return true;

  const rolloutRaw = Number(import.meta.env.VITE_CHAT_WARDROBE_RECOMMENDATIONS_ROLLOUT || 0);
  const rollout = Number.isFinite(rolloutRaw) ? Math.max(0, Math.min(100, Math.floor(rolloutRaw))) : 0;
  if (rollout >= 100) return true;
  if (rollout <= 0) return false;
  return getStableRolloutBucket('ojodeloca-chat-wardrobe-recommendations-rollout-bucket') < rollout;
};

const shouldPreferSupabaseAuth = (): boolean => {
  if (typeof window === 'undefined') return false;
  const storage = getFeatureFlagStorage();

  const url = new URL(window.location.href);
  if (url.searchParams.has('code')) return true;
  if (url.hash.includes('access_token')) return true;
  if (!storage) return false;

  return storage.key(0) !== null
    ? Object.keys(storage).some((key) => /^sb-.*-auth-token$/.test(key))
    : false;
};

const shouldForceSupabaseAuthInLocalDev = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.PROD) return false;

  return !window.navigator.webdriver;
};

const applyAuthFlagPolicy = (flags: FeatureFlags): FeatureFlags => {
  if (shouldForceSupabaseAuthInLocalDev() || shouldPreferSupabaseAuth()) {
    return {
      ...flags,
      useSupabaseAuth: true,
    };
  }

  return flags;
};

// Default feature flags - tuned for local/dev. Production enforcement happens below.
// ⚠️ SECURITY: useSupabaseAI should be TRUE in production to route AI calls through Edge Functions
const defaultFlags: FeatureFlags = {
  useSupabaseAuth: true, // ✅ Enabled - AuthView uses Supabase authentication
  useSupabaseCloset: true,
  useSupabaseOutfits: true,
  useSupabaseAI: true, // ✅ SECURITY: Must be true - routes AI through Edge Functions (no exposed API key)
  useSupabasePreferences: false,
  autoMigration: false,
  enableHybridTryOn: false,
  enableUnifiedStudioStylist: false,
  enableOnDemandClosetAI: false,
  enableGuidedLookCreationBackend: false,
  enableShoppingAssistantV2: true,
  enableShoppingLinkVerification: true,
  enableShoppingGeoRouting: true,
  enableTimelinePublishing: true,
  enableActivitySaveToCloset: true,
  enableLinkedSourceItems: true,
  enableSocialCommentsThreaded: true,
  enableSocialNotificationsCenter: true,
  enableFollowersGraph: true,
  enableSocialModeration: true,
  enableChatWardrobeRecommendations: true,
  enableLooksFirstUpload: true,
  enableAnalyzeLookEntry: true,
  enableKumbiReferenceLookSeeding: true,
  enableStudioKumbiActions: true,
  enableKumbiLookExtraction: true,
};

const enforceProductionFlags = (flags: FeatureFlags): FeatureFlags => {
  if (!import.meta.env.PROD) return flags;
  return {
    ...flags,
    useSupabaseAuth: true,
    useSupabaseAI: true,
    useSupabaseCloset: true,
    enableShoppingAssistantV2: flags.enableShoppingAssistantV2 && isShoppingAssistantV2EnabledInProd(),
    enableChatWardrobeRecommendations: flags.enableChatWardrobeRecommendations
      && isChatWardrobeRecommendationsEnabledInProd(),
  };
};

// Load flags from localStorage, falling back to defaults
const loadFlags = (): FeatureFlags => {
  try {
    const stored = getFeatureFlagStorage()?.getItem(FEATURE_FLAGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return applyAuthFlagPolicy(enforceProductionFlags({ ...defaultFlags, ...parsed }));
    }
  } catch (error) {
    console.error('Failed to load feature flags:', error);
  }
  return applyAuthFlagPolicy(enforceProductionFlags(defaultFlags));
};

// Save flags to localStorage
const saveFlags = (flags: FeatureFlags): void => {
  try {
    const storage = getFeatureFlagStorage();
    storage?.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(flags));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(FEATURE_FLAGS_UPDATED_EVENT, { detail: flags }));
    }
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
  currentFlags = applyAuthFlagPolicy(enforceProductionFlags({ ...currentFlags, ...flags }));
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
    enableShoppingAssistantV2: true,
    enableShoppingLinkVerification: true,
    enableShoppingGeoRouting: true,
    enableTimelinePublishing: true,
    enableActivitySaveToCloset: true,
    enableLinkedSourceItems: true,
    enableSocialCommentsThreaded: true,
    enableSocialNotificationsCenter: true,
    enableFollowersGraph: true,
    enableSocialModeration: true,
    enableChatWardrobeRecommendations: true,
  });
};
