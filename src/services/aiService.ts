/**
 * AI Service
 *
 * Unified AI service that routes between direct Gemini API calls
 * and Supabase Edge Functions based on feature flags.
 *
 * Includes subscription limits enforcement for AI generations.
 */

import type { ClothingItem, ClothingItemMetadata, FitResult, PackingListResult } from '../../types';
import { getFeatureFlag } from '../config/features';
import { logger } from '../utils/logger';
import * as edgeClient from './edgeFunctionClient';
import * as geminiService from '../../services/geminiService-rest';
import * as geminiServiceFull from '../../services/geminiService';
import { canGenerateOutfit, incrementAIGeneration } from './subscriptionService';
import { retryAIOperation } from '../../utils/retryWithBackoff';

// ⛔ SECURITY: All AI calls MUST go through Edge Functions (server-side)
// Direct client-side API key configuration is DISABLED for security

/**
 * Analyze a clothing item image
 */
export async function analyzeClothingItem(
  imageDataUrl: string
): Promise<ClothingItemMetadata> {
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    try {
      return await edgeClient.analyzeClothingViaEdge(imageDataUrl);
    } catch (error) {
      logger.error('Edge Function failed, falling back to direct API:', error);
      // Fallback to direct API if Edge Function fails
      return await geminiService.analyzeClothingItem(imageDataUrl);
    }
  }

  // Use direct Gemini API (legacy)
  return await geminiService.analyzeClothingItem(imageDataUrl);
}

/**
 * Analyze multiple clothing items in a single batch
 *
 * @param imageDataUrls - Array of base64 data URLs
 * @returns Array of ClothingItemMetadata in the same order
 */
export async function analyzeBatchClothingItems(
  imageDataUrls: string[]
): Promise<ClothingItemMetadata[]> {
  // Batch analysis only works with direct Gemini API (not Edge Functions yet)
  // Edge Functions have size limits that make batching impractical
  return await geminiService.analyzeBatchClothingItems(imageDataUrls);
}

/**
 * Generate an outfit
 *
 * Includes subscription limit verification before generation
 * and usage tracking after successful generation.
 */
export async function generateOutfit(
  prompt: string,
  closet: ClothingItem[]
): Promise<FitResult> {
  // ✅ STEP 1: Check if user can generate (subscription limits)
  const canGenerate = await canGenerateOutfit();

  if (!canGenerate.allowed) {
    throw new Error(canGenerate.reason || 'Has alcanzado tu límite de generaciones. Upgradeá tu plan para continuar.');
  }

  // ✅ STEP 2: Generate outfit (with retry)
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');
  let result: FitResult;

  result = await retryAIOperation(async () => {
    if (useSupabaseAI) {
      try {
        // Extract IDs for Edge Function
        const closetItemIds = closet.map(item => item.id);
        return await edgeClient.generateOutfitViaEdge(prompt, closetItemIds);
      } catch (error) {
        logger.error('Edge Function failed, falling back to direct API:', error);
        // Fallback to direct API if Edge Function fails
        return await geminiServiceFull.generateOutfit(prompt, closet);
      }
    } else {
      // Use direct Gemini API (legacy)
      return await geminiServiceFull.generateOutfit(prompt, closet);
    }
  });

  // ✅ STEP 3: Increment usage counter (only on success)
  const incremented = await incrementAIGeneration();
  if (!incremented) {
    logger.warn('Failed to increment AI generation counter, but outfit was generated');
  }

  return result;
}

/**
 * Generate a packing list
 *
 * Includes subscription limit verification before generation
 * and usage tracking after successful generation.
 */
export async function generatePackingList(
  prompt: string,
  closet: ClothingItem[]
): Promise<PackingListResult> {
  // ✅ STEP 1: Check if user can generate (subscription limits)
  const canGenerate = await canGenerateOutfit();

  if (!canGenerate.allowed) {
    throw new Error(canGenerate.reason || 'Has alcanzado tu límite de generaciones. Upgradeá tu plan para continuar.');
  }

  // ✅ STEP 2: Generate packing list (with retry)
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');
  let result: PackingListResult;

  result = await retryAIOperation(async () => {
    if (useSupabaseAI) {
      try {
        // Extract IDs for Edge Function
        const closetItemIds = closet.map(item => item.id);
        return await edgeClient.generatePackingListViaEdge(prompt, closetItemIds);
      } catch (error) {
        logger.error('Edge Function failed, falling back to direct API:', error);
        // Fallback to direct API if Edge Function fails
        return await geminiServiceFull.generatePackingList(prompt, closet);
      }
    } else {
      // Use direct Gemini API (legacy)
      return await geminiServiceFull.generatePackingList(prompt, closet);
    }
  });

  // ✅ STEP 3: Increment usage counter (only on success)
  const incremented = await incrementAIGeneration();
  if (!incremented) {
    logger.warn('Failed to increment AI generation counter, but packing list was generated');
  }

  return result;
}

/**
 * Generate a clothing image (AI-generated)
 * Note: This still uses direct API as it doesn't need server-side processing
 */
export async function generateClothingImage(prompt: string): Promise<string> {
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    try {
      return await edgeClient.generateClothingImageViaEdge(prompt);
    } catch (error) {
      logger.error('Edge Function failed, falling back to direct API:', error);
      return await geminiServiceFull.generateClothingImage(prompt);
    }
  }

  // Use direct Gemini API (legacy)
  return await geminiServiceFull.generateClothingImage(prompt);
}

/**
 * Analyze shopping gaps in closet
 * Feature 23: Virtual Shopping Assistant
 */
export async function analyzeShoppingGaps(
  closet: ClothingItem[]
): Promise<import('../../types').ShoppingGap[]> {
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    try {
      // Simplify closet object for transport
      const simplifiedCloset = closet.map(item => ({
        id: item.id,
        metadata: item.metadata
      }));
      return await edgeClient.analyzeShoppingGapsViaEdge(simplifiedCloset);
    } catch (error) {
      logger.error('Edge Function failed, falling back to direct API:', error);
      return await geminiServiceFull.analyzeShoppingGaps(closet);
    }
  }

  // Use direct Gemini API (legacy)
  return await geminiServiceFull.analyzeShoppingGaps(closet);
}

/**
 * Generate shopping recommendations based on gaps
 * Feature 23: Virtual Shopping Assistant
 */
export async function generateShoppingRecommendations(
  gaps: import('../../types').ShoppingGap[],
  closet: ClothingItem[],
  budget?: number
): Promise<import('../../types').ShoppingRecommendation[]> {
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    try {
      const simplifiedCloset = closet.map(item => ({
        id: item.id,
        metadata: item.metadata
      }));
      return await edgeClient.generateShoppingRecommendationsViaEdge(gaps, simplifiedCloset, budget);
    } catch (error) {
      logger.error('Edge Function failed, falling back to direct API:', error);
      return await geminiServiceFull.generateShoppingRecommendations(gaps, closet, budget);
    }
  }

  // Use direct Gemini API (legacy)
  return await geminiServiceFull.generateShoppingRecommendations(gaps, closet, budget);
}

/**
 * Conversational shopping assistant
 * Feature 23: Virtual Shopping Assistant
 */
export async function conversationalShoppingAssistant(
  userMessage: string,
  chatHistory: import('../../types').ShoppingChatMessage[],
  closet: ClothingItem[],
  currentGaps?: import('../../types').ShoppingGap[],
  currentRecommendations?: import('../../types').ShoppingRecommendation[]
): Promise<import('../../types').ShoppingChatMessage> {
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    try {
      const context = {
        closet: closet.map(item => ({ id: item.id, metadata: item.metadata })),
        currentGaps,
        currentRecommendations
      };
      return await edgeClient.conversationalShoppingAssistantViaEdge(userMessage, chatHistory, context);
    } catch (error) {
      logger.error('Edge Function failed, falling back to direct API:', error);
      return await geminiServiceFull.conversationalShoppingAssistant(
        userMessage,
        chatHistory,
        closet,
        currentGaps,
        currentRecommendations
      );
    }
  }

  // Use direct Gemini API (legacy)
  return await geminiServiceFull.conversationalShoppingAssistant(
    userMessage,
    chatHistory,
    closet,
    currentGaps,
    currentRecommendations
  );
}

/**
 * Re-export all other geminiService functions
 * These don't have Edge Function equivalents yet, so they call geminiService directly
 */

// Virtual Try-On
export async function generateVirtualTryOn(
  userImage: string,
  topImage: string,
  bottomImage: string,
  shoesImage: string
): Promise<string> {
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    try {
      return await edgeClient.generateVirtualTryOnViaEdge(userImage, topImage, bottomImage, shoesImage);
    } catch (error) {
      logger.error('Edge Function failed, falling back to direct API:', error);
      return await geminiServiceFull.generateVirtualTryOn(userImage, topImage, bottomImage, shoesImage);
    }
  }

  return await geminiServiceFull.generateVirtualTryOn(userImage, topImage, bottomImage, shoesImage);
}

// Search and Discovery
export const findSimilarItems = geminiService.findSimilarItems;
export const searchShoppingSuggestions = geminiServiceFull.searchShoppingSuggestions;

// Color Palette Analysis
export const analyzeColorPalette = geminiServiceFull.analyzeColorPalette;

// Chat Services
export const chatWithFashionAssistant = geminiServiceFull.chatWithFashionAssistant;
export const parseOutfitFromChat = geminiServiceFull.parseOutfitFromChat;

// Weather Integration
export const generateWeatherOutfit = geminiServiceFull.generateWeatherOutfit;

// Lookbook Creation
export const generateLookbook = geminiServiceFull.generateLookbook;

// Style Challenges
export const generateStyleChallenge = geminiServiceFull.generateStyleChallenge;

// Feedback Analysis
export const analyzeFeedbackPatterns = geminiServiceFull.analyzeFeedbackPatterns;

// Closet Gap Analysis
export const analyzeClosetGaps = geminiServiceFull.analyzeClosetGaps;

// Brand Recognition
export const recognizeBrandAndPrice = geminiServiceFull.recognizeBrandAndPrice;

// Dupe Finder
export const findDupeAlternatives = geminiServiceFull.findDupeAlternatives;

// Capsule Wardrobe
export async function generateCapsuleWardrobe(
  closet: import('../../types').ClothingItem[],
  theme: import('../../types').CapsuleTheme,
  targetSize: import('../../types').CapsuleSize,
  season?: string
): Promise<import('../../types').CapsuleWardrobe> {
  // ⛔ SECURITY: All AI calls MUST go through Edge Functions
  // Direct client-side API calls are disabled for security
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    // TODO: Implement Edge Function for capsule wardrobe
    // For now, throw informative error
    throw new Error(
      'Capsule Wardrobe generation requires Edge Function implementation. ' +
      'Please contact support or disable useSupabaseAI flag temporarily.'
    );
  }

  // Fallback to direct call only if explicitly configured server-side
  return await geminiServiceFull.generateCapsuleWardrobe(closet, theme, targetSize, season);
}

// Style DNA
export const analyzeStyleDNA = geminiServiceFull.analyzeStyleDNA;

// AI Fashion Designer
export const generateFashionDesign = geminiServiceFull.generateFashionDesign;

// Style Evolution
export const analyzeStyleEvolution = geminiServiceFull.analyzeStyleEvolution;

// General Content Generation
export const generateContent = geminiServiceFull.generateContent;
