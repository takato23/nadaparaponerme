import { useState, useEffect } from 'react';
import { getFeatureFlag, type FeatureFlags } from '../config/features';

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

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [flag]);

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

  return {
    useSupabaseAuth,
    useSupabaseCloset,
    useSupabaseOutfits,
    useSupabaseAI,
    useSupabasePreferences,
    autoMigration,
  };
};
