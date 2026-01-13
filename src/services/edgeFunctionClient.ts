/**
 * Edge Function Client
 *
 * Client for calling Supabase Edge Functions.
 * Provides secure proxies for AI services (Gemini).
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { ClothingItemMetadata, FitResult, PackingListResult } from '../../types';

// Helper to add timeout to Supabase invocations
const invokeWithTimeout = async (functionName: string, options: any, timeoutMs = 90000) => {
  const start = Date.now();
  console.log(`[Edge Function] Invoking ${functionName}... (Timeout: ${timeoutMs}ms)`);

  const timeoutPromise = new Promise<any>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      supabase.functions.invoke(functionName, options),
      timeoutPromise
    ]);
    const duration = Date.now() - start;
    console.log(`[Edge Function] ${functionName} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[Edge Function] ${functionName} failed after ${duration}ms:`, error);
    throw error;
  }
};

/**
 * Analyze clothing item using Edge Function
 */
export async function analyzeClothingViaEdge(
  imageDataUrl: string
): Promise<ClothingItemMetadata> {
  try {
    const { data, error } = await invokeWithTimeout('analyze-clothing', {
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
    const { data, error } = await invokeWithTimeout('generate-outfit', {
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to generate outfit via Edge Function: ${message}`);
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
    const { data, error } = await invokeWithTimeout('generate-packing-list', {
      body: {
        prompt,
        closetItemIds,
      },
    });

    if (error) throw error;

    return {
      packing_list: data.packing_list || [],
      outfit_suggestions: data.outfit_suggestions || '',
    };
  } catch (error) {
    logger.error('Edge function generate-packing-list failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to generate packing list via Edge Function: ${message}`);
  }
}

/**
 * Generate Virtual Try-On using Edge Function (Legacy format)
 */
export async function generateVirtualTryOnViaEdge(
  userImage: string,
  topImage: string,
  bottomImage: string,
  shoesImage?: string,
  quality?: 'flash' | 'pro'
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('virtual-try-on', {
      body: {
        userImage,
        topImage,
        bottomImage,
        shoesImage,
        quality,
      },
    });

    if (error) throw error;

    const resultImage = data?.resultImage || data?.image;
    if (!resultImage) {
      throw new Error('Edge Function did not return image data');
    }

    return resultImage;
  } catch (error) {
    logger.error('Edge function virtual-try-on failed:', error);
    throw new Error('Failed to generate virtual try-on via Edge Function');
  }
}

/**
 * Available presets for virtual try-on backgrounds
 */
export type VirtualTryOnPreset =
  | 'overlay'       // Keep original background
  | 'studio'        // Professional studio, gray backdrop
  | 'editorial'     // Magazine-style dramatic lighting
  | 'mirror_selfie' // Mirror selfie in bedroom/closet
  | 'street'        // Urban street style
  | 'golden_hour'   // Sunset golden lighting
  | 'minimalist'    // Clean white background
  | 'coffee_shop'   // Cozy cafe aesthetic
  | 'home';         // Modern living room

/**
 * Preset configurations for UI display
 */
export const VIRTUAL_TRYON_PRESETS: Array<{
  id: VirtualTryOnPreset;
  name: string;
  icon: string;
  description: string;
}> = [
    { id: 'overlay', name: 'Original', icon: 'filter_none', description: 'Mantiene tu fondo' },
    { id: 'mirror_selfie', name: 'Selfie Espejo', icon: 'door_sliding', description: 'Frente al espejo de tu cuarto' },
    { id: 'studio', name: 'Estudio', icon: 'photo_camera', description: 'Fondo profesional' },
    { id: 'street', name: 'Calle', icon: 'location_city', description: 'Look urbano' },
    { id: 'golden_hour', name: 'Atardecer', icon: 'wb_twilight', description: 'Luz dorada' },
    { id: 'coffee_shop', name: 'Café', icon: 'local_cafe', description: 'Ambiente acogedor' },
    { id: 'home', name: 'Living', icon: 'weekend', description: 'Tu casa' },
    { id: 'editorial', name: 'Editorial', icon: 'auto_awesome', description: 'Estilo revista' },
    { id: 'minimalist', name: 'Minimalista', icon: 'crop_square', description: 'Fondo blanco' },
  ];

/**
 * Generate Virtual Try-On with slot system
 */
export async function generateVirtualTryOnWithSlots(
  userImage: string,
  slots: Record<string, string>, // slot name -> image URL or base64
  options: {
    preset?: VirtualTryOnPreset;
    quality?: 'flash' | 'pro';
    customScene?: string; // For 'custom' preset - user-defined scene description
    keepPose?: boolean; // When true, AI preserves the exact pose from the selfie (better face consistency)
    useFaceReferences?: boolean; // When true, uses uploaded face reference photos for better identity
  } = {}
): Promise<{
  resultImage: string;
  model: string;
  slotsUsed: string[];
  faceReferencesUsed?: number;
}> {
  try {
    const { data, error } = await invokeWithTimeout('virtual-try-on', {
      body: {
        userImage,
        slots,
        preset: options.preset || 'overlay',
        quality: options.quality || 'flash',
        customScene: options.customScene,
        keepPose: options.keepPose ?? false,
        useFaceReferences: options.useFaceReferences ?? true, // Default to true if not specified
      },
    });

    if (error) throw error;

    const resultImage = data?.resultImage || data?.image;
    if (!resultImage) {
      throw new Error('Edge Function did not return image data');
    }

    return {
      resultImage,
      model: data?.model,
      slotsUsed: data?.slotsUsed || [],
      faceReferencesUsed: data?.faceReferencesUsed || 0,
    };
  } catch (error: any) {
    // Log full error object for debugging
    console.error('Edge Function (Gemini) Error Details:', error);

    // Try to extract more details if it's a FunctionsHttpError
    if (error?.context?.json) {
      try {
        const errorBody = await error.context.json();
        console.error('Edge Function (Gemini) Response JSON:', errorBody);
        if (errorBody.error) {
          const detail = errorBody.code ? `${errorBody.error} (${errorBody.code})` : errorBody.error;
          throw new Error(`Edge Function: ${detail}`);
        }
      } catch (e) {
        // ignore json parse error
      }
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Edge function virtual-try-on (slots) failed:', message);
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
 * Generate Image using OpenAI Via Edge Function
 */
export async function generateOpenAIImageViaEdge(
  prompt: string,
  options: {
    model?: string;
    quality?: 'standard' | 'hd' | 'low';
    size?: string;
    style?: 'vivid' | 'natural';
    n?: number;
  } = {}
): Promise<string> {
  try {
    const { data, error } = await invokeWithTimeout('openai-image-generation', {
      body: {
        prompt,
        ...options
      },
    });

    if (error) throw error;

    return data.resultImage;

  } catch (error: any) {
    // Log full error object for debugging
    console.error('Edge Function Error Details:', error);

    // Check for "message channel closed" error specifically
    if (error?.message?.includes('message channel closed')) {
      console.error('Browser Extension Conflict: A browser extension (like React DevTools or an AdBlocker) might be interfering with the request.');
    }

    // Try to extract more details if it's a FunctionsHttpError
    if (error?.context?.json) {
      try {
        const errorBody = await error.context.json();
        console.error('Edge Function Response JSON:', errorBody);
        if (errorBody.error) {
          throw new Error(`Edge Function: ${errorBody.error}`);
        }
      } catch (e) {
        // ignore json parse error
      }
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Edge function openai-image-generation failed:', message);
    throw new Error(`Failed to generate OpenAI image via Edge Function: ${message}`);
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
 * Analyze Style DNA using Edge Function
 */
export async function analyzeStyleDNAViaEdge(
  closet: Array<{ id: string; metadata: any }>
): Promise<any> {
  try {
    const { data, error } = await invokeWithTimeout('analyze-style-dna', {
      body: { closet },
    });

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Edge function analyze-style-dna failed:', error);
    throw new Error('Failed to analyze style DNA via Edge Function');
  }
}

/**
 * Check if Edge Functions are available
 */
export async function checkEdgeFunctionsAvailable(): Promise<boolean> {
  try {
    return !error;
  } catch (error) {
    logger.warn('Edge Functions not available:', error);
    return false;
  }
}
