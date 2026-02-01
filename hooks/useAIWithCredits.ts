/**
 * useAIWithCredits Hook
 *
 * Wraps AI service calls with credit checking and tracking.
 * Automatically shows upgrade modal when limits are reached.
 */

import { useState, useCallback } from 'react';
import {
  canUseFeature,
  recordUsage,
  type FeatureType,
} from '../src/services/usageTrackingService';

export interface AICallResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  limitReached?: boolean;
  isPremiumLocked?: boolean;
}

export interface UseAIWithCreditsReturn {
  // Execute an AI call with credit checking
  executeWithCredits: <T>(
    feature: FeatureType,
    aiCall: () => Promise<T>
  ) => Promise<AICallResult<T>>;

  // State
  isLoading: boolean;
  lastError: string | null;

  // Modal state for integration
  showUpgradeNeeded: boolean;
  blockedFeature: FeatureType | null;
  dismissUpgrade: () => void;
}

export function useAIWithCredits(): UseAIWithCreditsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [showUpgradeNeeded, setShowUpgradeNeeded] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState<FeatureType | null>(null);

  const executeWithCredits = useCallback(async <T>(
    feature: FeatureType,
    aiCall: () => Promise<T>
  ): Promise<AICallResult<T>> => {
    setIsLoading(true);
    setLastError(null);

    try {
      // Check if user can use this feature
      const status = canUseFeature(feature);

      if (!status.canUse) {
        setBlockedFeature(feature);
        setShowUpgradeNeeded(true);

        return {
          success: false,
          limitReached: !status.isPremiumLocked,
          isPremiumLocked: status.isPremiumLocked,
          error: status.isPremiumLocked
            ? 'Esta función requiere un plan Pro o Premium'
            : `Alcanzaste tu límite mensual (${status.used}/${status.limit})`,
        };
      }

      // Execute the AI call
      const data = await aiCall();

      // Record usage after successful call
      recordUsage(feature);

      return {
        success: true,
        data,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setLastError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const dismissUpgrade = useCallback(() => {
    setShowUpgradeNeeded(false);
    setBlockedFeature(null);
  }, []);

  return {
    executeWithCredits,
    isLoading,
    lastError,
    showUpgradeNeeded,
    blockedFeature,
    dismissUpgrade,
  };
}

/**
 * Feature-specific hooks for cleaner usage
 */

// Hook for outfit generation
export function useOutfitGenerationCredits() {
  const { executeWithCredits, ...rest } = useAIWithCredits();

  const generateOutfit = useCallback(async <T>(aiCall: () => Promise<T>) => {
    return executeWithCredits('outfit_generation', aiCall);
  }, [executeWithCredits]);

  return { generateOutfit, ...rest };
}

// Hook for clothing analysis
export function useClothingAnalysisCredits() {
  const { executeWithCredits, ...rest } = useAIWithCredits();

  const analyzeClothing = useCallback(async <T>(aiCall: () => Promise<T>) => {
    return executeWithCredits('clothing_analysis', aiCall);
  }, [executeWithCredits]);

  return { analyzeClothing, ...rest };
}

// Hook for fashion chat
export function useFashionChatCredits() {
  const { executeWithCredits, ...rest } = useAIWithCredits();

  const sendMessage = useCallback(async <T>(aiCall: () => Promise<T>) => {
    return executeWithCredits('fashion_chat', aiCall);
  }, [executeWithCredits]);

  return { sendMessage, ...rest };
}

// Hook for virtual try-on (premium)
export function useVirtualTryOnCredits() {
  const { executeWithCredits, ...rest } = useAIWithCredits();

  const tryOn = useCallback(async <T>(aiCall: () => Promise<T>) => {
    return executeWithCredits('virtual_tryon', aiCall);
  }, [executeWithCredits]);

  return { tryOn, ...rest };
}

// Hook for image generation (premium, expensive)
export function useImageGenerationCredits() {
  const { executeWithCredits, ...rest } = useAIWithCredits();

  const generateImage = useCallback(async <T>(aiCall: () => Promise<T>) => {
    return executeWithCredits('image_generation', aiCall);
  }, [executeWithCredits]);

  return { generateImage, ...rest };
}

export default useAIWithCredits;
