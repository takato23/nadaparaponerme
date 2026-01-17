/**
 * AI Service
 *
 * Unified AI service that routes between direct Gemini API calls
 * and Supabase Edge Functions based on feature flags.
 *
 * Includes subscription limits enforcement for AI generations.
 */

import type { ClothingItem, ClothingItemMetadata, FitResult, PackingListResult, GenerationPreset } from '../../types';
import { getFeatureFlag } from '../config/features';
import { V1_SAFE_MODE } from '../config/runtime';
import * as edgeClient from './edgeFunctionClient';
import * as geminiService from '../../services/geminiService-rest';
import * as geminiServiceFull from '../../services/geminiService';

import { GENERATION_PRESETS } from '../../types';
import { canGenerateOutfit } from './subscriptionService';
import { retryAIOperation } from '../../utils/retryWithBackoff';

// ⛔ SECURITY: All AI calls MUST go through Edge Functions (server-side)
// Direct client-side API key configuration is DISABLED for security

function assertFeatureAvailable(featureLabel: string): never {
  throw new Error(`${featureLabel} está temporalmente desactivado en la V1.`);
}

async function mapWithConcurrency<TIn, TOut>(
  items: TIn[],
  concurrency: number,
  worker: (item: TIn, index: number) => Promise<TOut>
): Promise<TOut[]> {
  const results: TOut[] = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }).map(async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Analyze a clothing item image
 */
export async function analyzeClothingItem(
  imageDataUrl: string
): Promise<ClothingItemMetadata> {
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    return await edgeClient.analyzeClothingViaEdge(imageDataUrl);
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
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  // V1 SAFE: route batch through Edge by fan-out (bounded concurrency) to avoid client-side API keys
  if (useSupabaseAI) {
    return await mapWithConcurrency(imageDataUrls, 3, async (dataUrl) => {
      return await edgeClient.analyzeClothingViaEdge(dataUrl);
    });
  }

  // Legacy direct path (development only)
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
    throw new Error(canGenerate.reason || 'Has alcanzado tu límite de créditos. Upgradeá tu plan para continuar.');
  }

  // 🛡️ Safe Mode
  if (V1_SAFE_MODE) {
    console.info('🛡️ V1 Safe Mode: Using mock outfit generation');
    await new Promise(resolve => setTimeout(resolve, 2500));
    const randomItem = (list: ClothingItem[]) => list.length > 0 ? list[Math.floor(Math.random() * list.length)].id : undefined;

    return {
      top_id: randomItem(closet.filter(i => i.metadata.category === 'top')),
      bottom_id: randomItem(closet.filter(i => i.metadata.category === 'bottom')),
      shoes_id: randomItem(closet.filter(i => i.metadata.category === 'shoes')),
      explanation: 'Este es un outfit generado en Modo Seguro (sin IA real). Combina tus prendas disponibles de forma aleatoria para testing.',
      missing_piece_suggestion: {
        item_name: 'Accesorio de prueba',
        reason: 'Para completar el look'
      }
    };
  }

  // ✅ STEP 2: Generate outfit (with retry)
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');
  let result: FitResult;

  result = await retryAIOperation(async () => {
    if (useSupabaseAI) {
      // Extract IDs for Edge Function
      const closetItemIds = closet.map(item => item.id);
      return await edgeClient.generateOutfitViaEdge(prompt, closetItemIds);
    } else {
      // Use direct Gemini API (legacy)
      return await geminiServiceFull.generateOutfit(prompt, closet);
    }
  });

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
    throw new Error(canGenerate.reason || 'Has alcanzado tu límite de créditos. Upgradeá tu plan para continuar.');
  }

  // 🛡️ Safe Mode
  if (V1_SAFE_MODE) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    return {
      packing_list: [
        'Camiseta de prueba - Básico esencial',
        'Jeans cómodos - Versatilidad',
        'Zapatillas - Caminar mucho'
      ],
      outfit_suggestions: 'Este es un plan de viaje simulado en Modo Seguro.'
    };
  }

  // ✅ STEP 2: Generate packing list (with retry)
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');
  let result: PackingListResult;

  result = await retryAIOperation(async () => {
    if (useSupabaseAI) {
      // Extract IDs for Edge Function
      const closetItemIds = closet.map(item => item.id);
      return await edgeClient.generatePackingListViaEdge(prompt, closetItemIds);
    } else {
      // Use direct Gemini API (legacy)
      return await geminiServiceFull.generatePackingList(prompt, closet);
    }
  });

  return result;
}

/**
 * Generate a clothing image (AI-generated)
 * Note: This still uses direct API as it doesn't need server-side processing
 */
export async function generateClothingImage(prompt: string): Promise<string> {
  // 🛡️ Safe Mode
  if (V1_SAFE_MODE) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Return a placeholder image
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjODg4Ij5UaGlzIGlzIGEgbW9jayBpbWFnZTwvdGV4dD48L3N2Zz4=';
  }

  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    return await edgeClient.generateClothingImageViaEdge(prompt);
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
  if (V1_SAFE_MODE) return []; // Mock empty gaps

  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    // Simplify closet object for transport
    const simplifiedCloset = closet.map(item => ({
      id: item.id,
      metadata: item.metadata
    }));
    return await edgeClient.analyzeShoppingGapsViaEdge(simplifiedCloset);
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
  if (V1_SAFE_MODE) return [];

  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    const simplifiedCloset = closet.map(item => ({
      id: item.id,
      metadata: item.metadata
    }));
    return await edgeClient.generateShoppingRecommendationsViaEdge(gaps, simplifiedCloset, budget);
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
  if (V1_SAFE_MODE) {
    return {
      id: `system_${Date.now()}`,
      role: 'assistant',
      content: 'El asistente de compras está desactivado en Modo Seguro.',
      timestamp: new Date().toISOString()
    };
  }

  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    const context = {
      closet: closet.map(item => ({ id: item.id, metadata: item.metadata })),
      currentGaps,
      currentRecommendations
    };
    return await edgeClient.conversationalShoppingAssistantViaEdge(userMessage, chatHistory, context);
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

// Virtual Try-On (Legacy)
export async function generateVirtualTryOn(
  userImage: string,
  topImage: string,
  bottomImage: string,
  shoesImage?: string,
  quality?: 'flash' | 'pro'
): Promise<string> {
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    return await edgeClient.generateVirtualTryOnViaEdge(userImage, topImage, bottomImage, shoesImage, quality);
  }

  return await geminiServiceFull.generateVirtualTryOn(userImage, topImage, bottomImage, shoesImage);
}

// Virtual Try-On with Slot System
export async function generateVirtualTryOnWithSlots(
  userImage: string,
  slots: Record<string, string>,
  options: {
    preset?: GenerationPreset;
    quality?: 'flash' | 'pro';
    customScene?: string;
    // New option for provider
    provider?: 'google' | 'openai';
    slotItems?: Array<{ slot: string; item: ClothingItem }>;
    fit?: 'tight' | 'regular' | 'oversized';
    view?: 'front' | 'back' | 'side';
    slotFits?: Record<string, 'tight' | 'regular' | 'oversized'>;
    keepPose?: boolean;
    useFaceReferences?: boolean;
  } = {}
): Promise<{
  resultImage: string;
  model: string;
  slotsUsed: string[];
  faceReferencesUsed?: number;
}> {
  // OpenAI Client-Side Test Path
  if (options.provider === 'openai') {
    console.log('Using OpenAI Provider (GPT Image 1.5)');
    const geminiOptions = { ...options } as any;
    delete geminiOptions.provider;
    delete geminiOptions.slotItems;

    // Construct prompt locally
    const presetConfig = GENERATION_PRESETS.find(p => p.id === (options.preset || 'overlay'));
    const presetPrompt = presetConfig?.promptModifier || '';
    const scenePrompt = options.preset === 'custom' ? (options.customScene || '') : presetPrompt;

    // Simple prompting strategy for the test
    // Construct detailed clothing description
    let clothingDescription = 'a stylish outfit';
    if (options.slotItems && options.slotItems.length > 0) {
      const items = options.slotItems.map(s => {
        const item = s.item;
        const color = item.metadata?.color_primary || '';
        const subcat = item.metadata?.subcategory || item.metadata?.category || 'garment';
        return `${color} ${subcat}`.trim();
      });
      clothingDescription = items.join(', ');
    }

    const fitMsg = options.fit && options.fit !== 'regular' ? `${options.fit} fit, ` : '';
    const viewMsg = options.view ? `${options.view} view, ` : 'front view, ';

    const prompt = `A highly realistic, professional fashion photo. ${viewMsg}${fitMsg}Model is wearing ${clothingDescription}. Scene: ${scenePrompt}. 8k resolution, highly detailed, fashion photography.`;

    // Call Edge Function for OpenAI generation
    try {
      const resultImage = await edgeClient.generateOpenAIImageViaEdge(prompt, {
        model: 'gpt-image-1.5',
        // Map quality if needed, but 'gpt-image-1.5' might imply high quality by default
        quality: options.quality === 'pro' ? 'hd' : 'standard'
      });

      return {
        resultImage,
        model: 'gpt-image-1.5',
        slotsUsed: Object.keys(slots),
        faceReferencesUsed: 0
      };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('must be verified') || message.includes('verification')) {
        console.warn('OpenAI image generation requires org verification. Falling back to Gemini.');
        return await edgeClient.generateVirtualTryOnWithSlots(userImage, slots, geminiOptions);
      }
      throw error;
    }
  }

  // Always use Edge Function for slot-based try-on (Gemini / Nano Banana Pro)
  return await edgeClient.generateVirtualTryOnWithSlots(userImage, slots, options as any);
}

// Search and Discovery
export async function findSimilarItems(...args: Parameters<typeof geminiService.findSimilarItems>) {
  if (V1_SAFE_MODE) return [];
  if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Búsqueda de similares');
  return await geminiService.findSimilarItems(...args);
}

export async function searchShoppingSuggestions(...args: Parameters<typeof geminiServiceFull.searchShoppingSuggestions>) {
  if (V1_SAFE_MODE) return [];
  if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Sugerencias de compra');
  return await geminiServiceFull.searchShoppingSuggestions(...args);
}

// Search Products for Specific Item
export async function searchProductsForItem(...args: Parameters<typeof geminiServiceFull.searchProductsForItem>) {
  if (V1_SAFE_MODE) return [];
  if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Búsqueda de productos');
  return await geminiServiceFull.searchProductsForItem(...args);
}

// Search Products from Image
export async function searchProductsFromImage(...args: Parameters<typeof geminiServiceFull.searchProductsFromImage>) {
  if (V1_SAFE_MODE) return { description: '', category: '', links: [] };
  if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Búsqueda de productos por imagen');
  return await geminiServiceFull.searchProductsFromImage(...args);
}

// Color Palette Analysis
export async function analyzeColorPalette(...args: Parameters<typeof geminiServiceFull.analyzeColorPalette>) {
  if (V1_SAFE_MODE) return { palette: [], harmony: 'Mono', advice: 'Safe Mode' };
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');
  if (useSupabaseAI) {
    // Extract closet items for Edge Function
    const closet = args[0];
    const closetItems = closet.map(item => ({
      id: item.id,
      category: item.metadata.category,
      color_primary: item.metadata.color_primary,
      vibes: item.metadata.vibe_tags,
    }));
    return await edgeClient.analyzeColorPaletteViaEdge(closetItems);
  }
  return await geminiServiceFull.analyzeColorPalette(...args);
}

// Chat Services
export async function chatWithFashionAssistant(...args: Parameters<typeof geminiServiceFull.chatWithFashionAssistant>) {
  if (V1_SAFE_MODE) return { role: 'assistant', content: 'Safe Mode enabled.' };
  const useSupabaseAI = getFeatureFlag('useSupabaseAI');

  if (useSupabaseAI) {
    // Route through Edge Function for security
    const [userMessage, inventory, chatHistory, onStreamChunk] = args;

    // Simulate streaming for better UX while waiting for Edge Function
    if (onStreamChunk) {
      onStreamChunk('...'); // Initial typing indicator
    }

    const chatHistoryForEdge = (chatHistory || []).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
    const closetContext = inventory.map(item => ({
      id: item.id,
      metadata: item.metadata,
    }));

    // Add timeout to prevent hanging indefinitely
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve({ content: "¡Ups! Mi cerebro de fashionista se fue de shopping 🛍️. Probá de nuevo en un ratito 💅" }), 25000)
    );

    try {
      const response: any = await Promise.race([
        edgeClient.chatWithStylistViaEdge(userMessage, chatHistoryForEdge, closetContext),
        timeoutPromise
      ]);
      return response.content;
    } catch (error) {
      console.error('Error in chatWithFashionAssistant via Edge:', error);
      throw error;
    }
  }
  return await geminiServiceFull.chatWithFashionAssistant(...args);
}

export async function parseOutfitFromChat(...args: Parameters<typeof geminiServiceFull.parseOutfitFromChat>) {
  if (V1_SAFE_MODE) return null;
  // if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Chat IA');
  return await geminiServiceFull.parseOutfitFromChat(...args);
}

// Weather Integration
export async function generateWeatherOutfit(...args: Parameters<typeof geminiServiceFull.generateWeatherOutfit>) {
  if (V1_SAFE_MODE) return null;
  if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Outfit del día');
  return await geminiServiceFull.generateWeatherOutfit(...args);
}

// Lookbook Creation
export async function generateLookbook(...args: Parameters<typeof geminiServiceFull.generateLookbook>) {
  if (V1_SAFE_MODE) return { title: 'Safe Mode', description: '', outfits: [] };
  if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Lookbook');
  return await geminiServiceFull.generateLookbook(...args);
}

// Style Challenges
export async function generateStyleChallenge(...args: Parameters<typeof geminiServiceFull.generateStyleChallenge>) {
  // Return a dummy challenge for safe mode
  if (V1_SAFE_MODE) {
    return {
      id: 'mock-challenge',
      title: 'Desafío Safe Mode',
      description: 'Desafío de prueba.',
      difficulty: 'Easy',
      xpReward: 100,
      theme: 'Casual',
      requirements: ['Usar una prenda azul']
    };
  }
  if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Desafíos de estilo');
  return await geminiServiceFull.generateStyleChallenge(...args);
}

// Feedback Analysis
export async function analyzeFeedbackPatterns(...args: Parameters<typeof geminiServiceFull.analyzeFeedbackPatterns>) {
  if (V1_SAFE_MODE) return { trends: [], insights: [] };
  if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Análisis de feedback');
  return await geminiServiceFull.analyzeFeedbackPatterns(...args);
}

// Closet Gap Analysis
export async function analyzeClosetGaps(...args: Parameters<typeof geminiServiceFull.analyzeClosetGaps>) {
  if (V1_SAFE_MODE) return [];
  if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Análisis de gaps');
  return await geminiServiceFull.analyzeClosetGaps(...args);
}

// Brand Recognition
export async function recognizeBrandAndPrice(...args: Parameters<typeof geminiServiceFull.recognizeBrandAndPrice>) {
  if (V1_SAFE_MODE) return null;
  // if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Reconocimiento de marca');
  return await geminiServiceFull.recognizeBrandAndPrice(...args);
}

// Dupe Finder
export async function findDupeAlternatives(...args: Parameters<typeof geminiServiceFull.findDupeAlternatives>) {
  if (V1_SAFE_MODE) return [];
  // if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Dupe finder');
  return await geminiServiceFull.findDupeAlternatives(...args);
}

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

  if (V1_SAFE_MODE) {
    // Mock response
    return {
      name: 'Cápsula Safe Mode',
      strategy_explanation: 'Generada para testing',
      items: [],
      // outfits: [], // Removed as not in CapsuleWardrobe type
      compatibility_matrix: [],
      suggested_outfits: [],
      colorPalette: [],
      total_combinations: 0,
      size: targetSize,
      theme: theme,
      created_at: new Date().toISOString()
    };
  }

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
export async function analyzeStyleDNA(...args: Parameters<typeof geminiServiceFull.analyzeStyleDNA>) {
  // if (V1_SAFE_MODE) return { ... }; // Disabled to force real analysis as requested

  const useSupabaseAI = getFeatureFlag('useSupabaseAI');
  if (useSupabaseAI) {
    // Simplify closet object for transport
    const closet = args[0]; // first arg is closet
    const simplifiedCloset = closet.map(item => ({
      id: item.id,
      metadata: item.metadata
    }));
    return await edgeClient.analyzeStyleDNAViaEdge(simplifiedCloset);
  }

  return await geminiServiceFull.analyzeStyleDNA(...args);
}

// AI Fashion Designer
export async function generateFashionDesign(...args: Parameters<typeof geminiServiceFull.generateFashionDesign>) {
  if (V1_SAFE_MODE) return { title: 'Design', description: 'Mock', imageUrl: '' };
  if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('AI Designer');
  return await geminiServiceFull.generateFashionDesign(...args);
}

// Style Evolution
export async function analyzeStyleEvolution(...args: Parameters<typeof geminiServiceFull.analyzeStyleEvolution>) {
  if (V1_SAFE_MODE) return { timeline: [], prediction: '' };
  if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Evolución de estilo');
  return await geminiServiceFull.analyzeStyleEvolution(...args);
}

// General Content Generation
export async function generateContent(...args: Parameters<typeof geminiServiceFull.generateContent>) {
  if (V1_SAFE_MODE) return 'Contenido mock en Safe Mode';
  if (getFeatureFlag('useSupabaseAI')) return assertFeatureAvailable('Generación de contenido');
  return await geminiServiceFull.generateContent(...args);
}
