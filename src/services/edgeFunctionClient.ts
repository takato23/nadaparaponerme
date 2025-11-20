/**
 * Edge Function Client
 *
 * Client for calling Supabase Edge Functions.
 * Provides secure proxies for AI services (Gemini).
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { ClothingItemMetadata, FitResult, PackingListResult } from '../../types';

/**
 * Analyze clothing item using Edge Function
 */
export async function analyzeClothingViaEdge(
  imageDataUrl: string
): Promise<ClothingItemMetadata> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-clothing', {
      body: { imageDataUrl },
    });

    if (error) throw error;

    // Map the response to ClothingItemMetadata format
    return {
      category: data.category || 'top',
      subcategory: data.subcategory || '',
      color_primary: data.color_primary || '',
      neckline: data.neckline,
      sleeve_type: data.sleeve_type,
      vibe_tags: data.vibe_tags || [],
      seasons: data.seasons || [],
      description: data.description,
    };
  } catch (error) {
    logger.error('Edge function analyze-clothing failed:', error);
    throw new Error('Failed to analyze clothing item via Edge Function');
  }
}

/**
 * Generate outfit using Edge Function
 */
export async function generateOutfitViaEdge(
  prompt: string,
  closetItemIds: string[]
): Promise<FitResult> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-outfit', {
      body: {
        prompt,
        closetItemIds,
      },
    });

    if (error) throw error;

    // Map the response to FitResult format
    return {
      top_id: data.top_id,
      bottom_id: data.bottom_id,
      shoes_id: data.shoes_id,
      explanation: data.explanation || '',
      missing_piece_suggestion: data.missing_piece_suggestion,
    };
  } catch (error) {
    logger.error('Edge function generate-outfit failed:', error);
    throw new Error('Failed to generate outfit via Edge Function');
  }
}

/**
 * Generate packing list using Edge Function
 */
export async function generatePackingListViaEdge(
  prompt: string,
  closetItemIds: string[]
): Promise<PackingListResult> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'generate-packing-list',
      {
        body: {
          prompt,
          closetItemIds,
        },
      }
    );

    if (error) throw error;

    return {
      packing_list: data.packing_list || [],
      outfit_suggestions: data.outfit_suggestions || '',
    };
  } catch (error) {
    logger.error('Edge function generate-packing-list failed:', error);
    throw new Error('Failed to generate packing list via Edge Function');
  }
}

/**
 * Generate Virtual Try-On using Edge Function
 */
export async function generateVirtualTryOnViaEdge(
  userImage: string,
  topImage: string,
  bottomImage: string,
  shoesImage: string
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('virtual-try-on', {
      body: {
        userImage,
        topImage,
        bottomImage,
        shoesImage,
      },
    });

    if (error) throw error;

    return data.resultImage;
  } catch (error) {
    logger.error('Edge function virtual-try-on failed:', error);
    throw new Error('Failed to generate virtual try-on via Edge Function');
  }
}

/**
 * Generate Clothing Image using Edge Function
 */
export async function generateClothingImageViaEdge(
  prompt: string
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: { prompt },
    });

    if (error) throw error;

    return data.resultImage;
  } catch (error) {
    logger.error('Edge function generate-image failed:', error);
    throw new Error('Failed to generate clothing image via Edge Function');
  }
}

/**
 * Analyze Shopping Gaps using Edge Function
 */
export async function analyzeShoppingGapsViaEdge(
  closet: any[]
): Promise<any[]> {
  try {
    const { data, error } = await supabase.functions.invoke('shopping-assistant', {
      body: {
        action: 'analyze-gaps',
        closet,
      },
    });

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Edge function shopping-assistant (analyze-gaps) failed:', error);
    throw new Error('Failed to analyze shopping gaps via Edge Function');
  }
}

/**
 * Generate Shopping Recommendations using Edge Function
 */
export async function generateShoppingRecommendationsViaEdge(
  gaps: any[],
  closet: any[],
  budget?: number
): Promise<any[]> {
  try {
    const { data, error } = await supabase.functions.invoke('shopping-assistant', {
      body: {
        action: 'generate-recommendations',
        gaps,
        closet,
        budget,
      },
    });

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Edge function shopping-assistant (recommendations) failed:', error);
    throw new Error('Failed to generate shopping recommendations via Edge Function');
  }
}

/**
 * Conversational Shopping Assistant using Edge Function
 */
export async function conversationalShoppingAssistantViaEdge(
  message: string,
  history: any[],
  context: any
): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke('shopping-assistant', {
      body: {
        action: 'chat',
        message,
        history,
        context,
      },
    });

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Edge function shopping-assistant (chat) failed:', error);
    throw new Error('Failed to chat with shopping assistant via Edge Function');
  }
}

/**
 * Check if Edge Functions are available
 */
export async function checkEdgeFunctionsAvailable(): Promise<boolean> {
  try {
    // Try a simple health check by invoking with minimal payload
    const { error } = await supabase.functions.invoke('analyze-clothing', {
      body: { healthCheck: true },
    });

    // If no error, functions are available
    return !error;
  } catch (error) {
    logger.warn('Edge Functions not available:', error);
    return false;
  }
}
