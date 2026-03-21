import { useState, useEffect } from 'react';
import { FEATURE_FLAGS_UPDATED_EVENT, getFeatureFlag, type FeatureFlags } from '../src/config/features';

/**
 * React hook to use feature flags with reactive updates
 *
 * @param flag - The feature flag to watch
 * @returns The current value of the feature flag
 *
 * @example
 * const isSupabaseAuth = useFeatureFlag('useSupabaseAuth');
 * if (isSupabaseAuth) {
 *   // Use Supabase authentication
 * } else {
 *   // Use localStorage authentication
 * }
 */
export const useFeatureFlag = (flag: keyof FeatureFlags): boolean => {
  const [value, setValue] = useState(() => getFeatureFlag(flag));

  useEffect(() => {
    // Listen for storage changes (when flags are updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ojodeloca-feature-flags') {
        setValue(getFeatureFlag(flag));
      }
    };

    const handleLocalUpdate = () => {
      setValue(getFeatureFlag(flag));
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(FEATURE_FLAGS_UPDATED_EVENT, handleLocalUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(FEATURE_FLAGS_UPDATED_EVENT, handleLocalUpdate);
    };
  }, [flag]);

  useEffect(() => {
    const currentValue = getFeatureFlag(flag);
    if (currentValue !== value) {
      setValue(currentValue);
    }
  }, [flag, value]);

  // Also check for changes in the current tab
  useEffect(() => {
    const interval = setInterval(() => {
      const currentValue = getFeatureFlag(flag);
      setValue(prev => {
        if (prev !== currentValue) {
          return currentValue;
        }
        return prev;
      });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [flag]);

  return value;
};

/**
 * Hook to get all feature flags
 */
export const useFeatureFlags = (): FeatureFlags => {
  const useSupabaseAuth = useFeatureFlag('useSupabaseAuth');
  const useSupabaseCloset = useFeatureFlag('useSupabaseCloset');
  const useSupabaseOutfits = useFeatureFlag('useSupabaseOutfits');
  const useSupabaseAI = useFeatureFlag('useSupabaseAI');
  const useSupabasePreferences = useFeatureFlag('useSupabasePreferences');
  const autoMigration = useFeatureFlag('autoMigration');
  const enableHybridTryOn = useFeatureFlag('enableHybridTryOn');
  const enableUnifiedStudioStylist = useFeatureFlag('enableUnifiedStudioStylist');
  const enableOnDemandClosetAI = useFeatureFlag('enableOnDemandClosetAI');
  const enableGuidedLookCreationBackend = useFeatureFlag('enableGuidedLookCreationBackend');
  const enableShoppingAssistantV2 = useFeatureFlag('enableShoppingAssistantV2');
  const enableShoppingLinkVerification = useFeatureFlag('enableShoppingLinkVerification');
  const enableShoppingGeoRouting = useFeatureFlag('enableShoppingGeoRouting');
  const enableTimelinePublishing = useFeatureFlag('enableTimelinePublishing');
  const enableActivitySaveToCloset = useFeatureFlag('enableActivitySaveToCloset');
  const enableLinkedSourceItems = useFeatureFlag('enableLinkedSourceItems');
  const enableSocialCommentsThreaded = useFeatureFlag('enableSocialCommentsThreaded');
  const enableSocialNotificationsCenter = useFeatureFlag('enableSocialNotificationsCenter');
  const enableFollowersGraph = useFeatureFlag('enableFollowersGraph');
  const enableSocialModeration = useFeatureFlag('enableSocialModeration');
  const enableChatWardrobeRecommendations = useFeatureFlag('enableChatWardrobeRecommendations');
  const enableLooksFirstUpload = useFeatureFlag('enableLooksFirstUpload');
  const enableAnalyzeLookEntry = useFeatureFlag('enableAnalyzeLookEntry');
  const enableKumbiReferenceLookSeeding = useFeatureFlag('enableKumbiReferenceLookSeeding');
  const enableStudioKumbiActions = useFeatureFlag('enableStudioKumbiActions');

  return {
    useSupabaseAuth,
    useSupabaseCloset,
    useSupabaseOutfits,
    useSupabaseAI,
    useSupabasePreferences,
    autoMigration,
    enableHybridTryOn,
    enableUnifiedStudioStylist,
    enableOnDemandClosetAI,
    enableGuidedLookCreationBackend,
    enableShoppingAssistantV2,
    enableShoppingLinkVerification,
    enableShoppingGeoRouting,
    enableTimelinePublishing,
    enableActivitySaveToCloset,
    enableLinkedSourceItems,
    enableSocialCommentsThreaded,
    enableSocialNotificationsCenter,
    enableFollowersGraph,
    enableSocialModeration,
    enableChatWardrobeRecommendations,
    enableLooksFirstUpload,
    enableAnalyzeLookEntry,
    enableKumbiReferenceLookSeeding,
    enableStudioKumbiActions,
  };
};
