/**
 * useUserCredits Hook
 *
 * React hook for managing user credits and feature access.
 * Provides real-time updates and easy integration with components.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getUserTier,
  setUserTier,
  canUseFeature,
  recordUsage,
  getAllFeatureStatuses,
  getUsageSummary,
  getFeatureDisplayName,
  formatUsageDisplay,
  type FeatureType,
  type UsageStatus,
  type UserTier,
} from '../services/usageTrackingService';

// ============================================================================
// TYPES
// ============================================================================

export interface UseUserCreditsReturn {
  // User tier
  tier: UserTier;
  setTier: (tier: UserTier) => void;
  isPremium: boolean;
  isPro: boolean;
  isFree: boolean;

  // Usage checking
  checkFeature: (feature: FeatureType) => UsageStatus;
  canUse: (feature: FeatureType) => boolean;
  useFeature: (feature: FeatureType) => Promise<boolean>;

  // All statuses
  allStatuses: UsageStatus[];
  refreshStatuses: () => void;

  // Summary
  summary: {
    totalUsed: number;
    totalLimit: number;
    percentUsed: number;
    daysUntilReset: number;
    premiumFeaturesLocked: number;
  };

  // UI helpers
  getDisplayName: (feature: FeatureType) => string;
  formatUsage: (status: UsageStatus) => string;
  getProgressColor: (percentUsed: number) => string;

  // Modal triggers
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  blockedFeature: FeatureType | null;
  triggerUpgradeModal: (feature: FeatureType) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useUserCredits(): UseUserCreditsReturn {
  const [tier, setTierState] = useState<UserTier>(getUserTier());
  const [allStatuses, setAllStatuses] = useState<UsageStatus[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState<FeatureType | null>(null);

  // Load statuses on mount and tier change
  const refreshStatuses = useCallback(() => {
    setAllStatuses(getAllFeatureStatuses());
  }, []);

  useEffect(() => {
    refreshStatuses();
  }, [tier, refreshStatuses]);

  // Set tier and persist
  const setTier = useCallback((newTier: UserTier) => {
    setUserTier(newTier);
    setTierState(newTier);
    refreshStatuses();
  }, [refreshStatuses]);

  // Check if feature can be used
  const checkFeature = useCallback((feature: FeatureType): UsageStatus => {
    return canUseFeature(feature);
  }, []);

  // Simple boolean check
  const canUse = useCallback((feature: FeatureType): boolean => {
    return canUseFeature(feature).canUse;
  }, []);

  // Use a feature (record usage + return success)
  const useFeature = useCallback(async (feature: FeatureType): Promise<boolean> => {
    const status = canUseFeature(feature);

    if (!status.canUse) {
      // Trigger upgrade modal
      setBlockedFeature(feature);
      setShowUpgradeModal(true);
      return false;
    }

    // Record usage
    const success = recordUsage(feature);

    // Refresh statuses after recording
    if (success) {
      refreshStatuses();
    }

    return success;
  }, [refreshStatuses]);

  // Trigger upgrade modal for a specific feature
  const triggerUpgradeModal = useCallback((feature: FeatureType) => {
    setBlockedFeature(feature);
    setShowUpgradeModal(true);
  }, []);

  // Get progress bar color based on usage
  const getProgressColor = useCallback((percentUsed: number): string => {
    if (percentUsed >= 90) return 'bg-red-500';
    if (percentUsed >= 70) return 'bg-orange-500';
    if (percentUsed >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  }, []);

  // Calculate summary
  const summary = getUsageSummary();

  return {
    // Tier
    tier,
    setTier,
    isPremium: tier === 'premium',
    isPro: tier === 'pro',
    isFree: tier === 'free',

    // Usage
    checkFeature,
    canUse,
    useFeature,

    // Statuses
    allStatuses,
    refreshStatuses,

    // Summary
    summary: {
      totalUsed: summary.totalUsed,
      totalLimit: summary.totalLimit,
      percentUsed: summary.percentUsed,
      daysUntilReset: summary.daysUntilReset,
      premiumFeaturesLocked: summary.premiumFeaturesLocked,
    },

    // UI helpers
    getDisplayName: getFeatureDisplayName,
    formatUsage: formatUsageDisplay,
    getProgressColor,

    // Modal
    showUpgradeModal,
    setShowUpgradeModal,
    blockedFeature,
    triggerUpgradeModal,
  };
}

// ============================================================================
// UTILITY HOOK - Check single feature
// ============================================================================

export function useFeatureAccess(feature: FeatureType) {
  const { checkFeature, useFeature, triggerUpgradeModal } = useUserCredits();
  const [status, setStatus] = useState<UsageStatus | null>(null);

  useEffect(() => {
    setStatus(checkFeature(feature));
  }, [feature, checkFeature]);

  const tryUse = useCallback(async (): Promise<boolean> => {
    const result = await useFeature(feature);
    if (result) {
      setStatus(checkFeature(feature));
    }
    return result;
  }, [feature, useFeature, checkFeature]);

  const showUpgrade = useCallback(() => {
    triggerUpgradeModal(feature);
  }, [feature, triggerUpgradeModal]);

  return {
    status,
    canUse: status?.canUse ?? false,
    isPremiumLocked: status?.isPremiumLocked ?? false,
    remaining: status?.remaining ?? 0,
    percentUsed: status?.percentUsed ?? 0,
    tryUse,
    showUpgrade,
  };
}

export default useUserCredits;
