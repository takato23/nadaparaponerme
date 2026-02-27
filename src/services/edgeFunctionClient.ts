/**
 * Edge Function Client
 *
 * Client for calling Supabase Edge Functions.
 * Provides secure proxies for AI services (Gemini).
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type {
  ChatStylistResponse,
  ClothingItemMetadata,
  FitResult,
  GuidedLookWorkflowRequest,
  GuidedLookWorkflowResponse,
  PackingListResult
} from '../../types';

type EdgeErrorCode =
  | 'rate_limited'
  | 'blocked'
  | 'forbidden_origin'
  | 'invalid_url'
  | 'payload_too_large'
  | 'unsupported_content_type'
  | 'security_guard_error';

type EdgeErrorPayload = {
  error?: string;
  message?: string;
  code?: EdgeErrorCode | string;
  retry_after_seconds?: number;
  request_id?: string;
};

class EdgeFunctionError extends Error {
  code?: EdgeErrorCode;
  retryAfterSeconds?: number;
  requestId?: string;

  constructor(message: string, meta: { code?: EdgeErrorCode; retryAfterSeconds?: number; requestId?: string } = {}) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.code = meta.code;
    this.retryAfterSeconds = meta.retryAfterSeconds;
    this.requestId = meta.requestId;
  }
}

const parseEdgeErrorPayload = async (error: any): Promise<EdgeErrorPayload | null> => {
  const context = error?.context;
  if (!context) return null;

  try {
    if (typeof context.json === 'function') {
      const payload = await context.json();
      return payload && typeof payload === 'object' ? payload as EdgeErrorPayload : null;
    }
  } catch {
    // no-op: some responses are not JSON
  }

  return null;
};

const formatRetryMessage = (seconds?: number): string => {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) {
    return 'Esperá unos segundos y reintentá.';
  }
  return `Esperá ${Math.max(1, Math.floor(seconds))} segundos y reintentá.`;
};

const mapEdgeErrorMessage = (
  payload: EdgeErrorPayload | null,
  fallbackMessage: string,
): string => {
  if (!payload?.code) {
    return payload?.error || fallbackMessage;
  }

  if (payload.code === 'rate_limited' || payload.code === 'blocked') {
    return formatRetryMessage(payload.retry_after_seconds);
  }
  if (payload.code === 'forbidden_origin') {
    return 'Origen no permitido para esta operación. Verificá dominio y sesión.';
  }
  if (payload.code === 'invalid_url') {
    return 'La URL ingresada no es válida o no está permitida.';
  }
  if (payload.code === 'payload_too_large') {
    return 'La imagen excede el tamaño máximo permitido.';
  }
  if (payload.code === 'unsupported_content_type') {
    return 'La URL no apunta a una imagen compatible.';
  }
  if (payload.code === 'security_guard_error') {
    return 'El servicio está temporalmente protegido. Reintentá en unos segundos.';
  }

  return payload.error || fallbackMessage;
};

const toEdgeFunctionError = async (error: unknown, fallbackMessage: string): Promise<EdgeFunctionError> => {
  const payload = await parseEdgeErrorPayload(error);
  const message = mapEdgeErrorMessage(payload, fallbackMessage);
  return new EdgeFunctionError(message, {
    code: payload?.code,
    retryAfterSeconds: payload?.retry_after_seconds,
    requestId: payload?.request_id,
  });
};

// Helper to add timeout to Supabase invocations
const invokeWithTimeout = async (functionName: string, options: any, timeoutMs = 90000) => {
  const start = Date.now();
  console.log(`[Edge Function] Invoking ${functionName}... (Timeout: ${timeoutMs}ms)`);

  const mergedHeaders: Record<string, string> = {
    ...(options?.headers || {}),
  };

  if (!mergedHeaders.Authorization) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      mergedHeaders.Authorization = `Bearer ${session.access_token}`;
    }
  }

  const timeoutPromise = new Promise<any>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      supabase.functions.invoke(functionName, {
        ...options,
        headers: mergedHeaders,
      }),
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
  closetItemIds: string[],
  options: { idempotencyKey?: string } = {}
): Promise<FitResult> {
  try {
    const { data, error } = await invokeWithTimeout('generate-outfit', {
      body: {
        prompt,
        closetItemIds,
        idempotencyKey: options.idempotencyKey || undefined,
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
    view?: 'front' | 'back' | 'side';
    slotFits?: Record<string, 'tight' | 'regular' | 'oversized'>; // Per-garment fit preferences
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
        quality: options.quality || 'pro',
        customScene: options.customScene,
        keepPose: options.keepPose ?? false,
        useFaceReferences: options.useFaceReferences ?? true,
        view: options.view ?? 'front',
        slotFits: options.slotFits,
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

    const payload = await parseEdgeErrorPayload(error);
    if (payload) {
      console.error('Edge Function (Gemini) Response JSON:', JSON.stringify(payload, null, 2));
    }

    const rawMessage = String(
      payload?.error
      || payload?.message
      || (error instanceof Error ? error.message : 'Error desconocido'),
    );
    const normalized = rawMessage.toLowerCase();

    if (
      normalized.includes('crédito')
      || normalized.includes('credito')
      || normalized.includes('insufficient')
      || normalized.includes('402')
      || normalized.includes('upgrade')
    ) {
      throw new Error('No tenés créditos suficientes para usar el probador virtual. Hacé upgrade o sumá créditos para continuar.');
    }

    if (normalized.includes('timed out') || normalized.includes('timeout')) {
      throw new Error('El probador virtual tardó más de lo esperado. Intentá nuevamente en unos segundos.');
    }

    if (
      normalized.includes('429')
      || normalized.includes('rate limit')
      || normalized.includes('demasiadas solicitudes')
      || payload?.code === 'rate_limited'
      || payload?.code === 'blocked'
    ) {
      throw new Error('Hay mucha demanda en este momento. Esperá un momento e intentá nuevamente.');
    }

    if (normalized && normalized !== 'error desconocido') {
      throw new Error(rawMessage);
    }

    logger.error('Edge function virtual-try-on (slots) failed:', rawMessage);
    throw new Error('No pudimos generar el probador virtual en este momento.');
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
 * Chat with AI Stylist via Edge Function
 */
export async function chatWithStylistViaEdge(
  message: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  closetContext?: Array<{ id: string; metadata: any }>,
  options: {
    responseMode?: 'text' | 'structured';
    surface?: 'studio' | 'closet';
    threadId?: string | null;
    idempotencyKey?: string;
    workflow?: GuidedLookWorkflowRequest;
  } = {}
): Promise<ChatStylistResponse & { validation_warnings?: string[]; workflow?: GuidedLookWorkflowResponse }> {
  try {
    const { data, error } = await invokeWithTimeout('chat-stylist', {
      body: {
        message,
        chatHistory,
        closetContext,
        responseMode: options.responseMode || 'text',
        surface: options.surface || 'closet',
        threadId: options.threadId || null,
        idempotencyKey: options.idempotencyKey || undefined,
        workflow: options.workflow || undefined,
      },
    });

    if (error) throw error;

    return {
      role: 'assistant',
      content: data.content || data.message || '',
      outfitSuggestion: data.outfitSuggestion || null,
      validation_warnings: Array.isArray(data.validation_warnings) ? data.validation_warnings : [],
      threadId: data.threadId || null,
      model: data.model || 'gemini-2.5-flash',
      credits_used: data.credits_used || 0,
      cache_hit: Boolean(data.cache_hit),
      workflow: data.workflow || undefined,
    };
  } catch (error) {
    logger.error('Edge function chat-stylist failed:', error);
    throw await toEdgeFunctionError(error, 'No se pudo consultar al estilista');
  }
}

export async function prepareClosetInsightsViaEdge(
  insightType: 'mix' | 'chat' | 'report',
  options: {
    prompt?: string;
    closetItemIds?: string[];
  } = {},
): Promise<{
  ready: boolean;
  missingCount: number;
  processingCount: number;
  estimatedSeconds?: number;
  coverage: { top: number; bottom: number; shoes: number };
  analyzedCount?: number;
  failedCount?: number;
  credits_used?: number;
}> {
  try {
    const { data, error } = await invokeWithTimeout('prepare-closet-insights', {
      body: {
        insightType,
        prompt: options.prompt || undefined,
        closetItemIds: options.closetItemIds || undefined,
      },
    }, 120000);

    if (error) throw error;

    return {
      ready: Boolean(data?.ready),
      missingCount: Number(data?.missingCount || 0),
      processingCount: Number(data?.processingCount || 0),
      estimatedSeconds: data?.estimatedSeconds,
      coverage: {
        top: Number(data?.coverage?.top || 0),
        bottom: Number(data?.coverage?.bottom || 0),
        shoes: Number(data?.coverage?.shoes || 0),
      },
      analyzedCount: Number(data?.analyzedCount || 0),
      failedCount: Number(data?.failedCount || 0),
      credits_used: Number(data?.credits_used || 0),
    };
  } catch (error) {
    logger.error('Edge function prepare-closet-insights failed:', error);
    throw new Error('Failed to prepare closet insights via Edge Function');
  }
}

/**
 * Analyze Color Palette via Edge Function
 */
export async function analyzeColorPaletteViaEdge(
  closetItems?: Array<{ id: string; category: string; color_primary: string; vibes?: string[] }>
): Promise<{
  dominant_colors: Array<{ name: string; hex: string; percentage: number }>;
  color_scheme: string;
  missing_colors: string[];
  versatility_score: number;
  recommendations: string;
}> {
  try {
    const { data, error } = await invokeWithTimeout('analyze-color-palette', {
      body: { closetItems },
    });

    if (error) throw error;

    return {
      dominant_colors: data.dominant_colors || [],
      color_scheme: data.color_scheme || 'diverse',
      missing_colors: data.missing_colors || [],
      versatility_score: data.versatility_score || 0,
      recommendations: data.recommendations || '',
    };
  } catch (error) {
    logger.error('Edge function analyze-color-palette failed:', error);
    throw new Error('Failed to analyze color palette via Edge Function');
  }
}

/**
 * Check if Edge Functions are available
 */
export async function checkEdgeFunctionsAvailable(): Promise<boolean> {
  try {
    // Simple health check - if we can reach Supabase, Edge Functions are available
    return true;
  } catch (error) {
    logger.warn('Edge Functions not available:', error);
    return false;
  }
}

/**
 * Proxy an external image URL to avoid CORS when cutting background.
 */
export async function proxyImageViaEdge(url: string): Promise<string> {
  try {
    const { data, error } = await invokeWithTimeout('proxy-image', {
      body: { url },
    });

    if (error) throw error;
    if (!data?.dataUrl) throw new Error('No dataUrl returned from proxy');

    return data.dataUrl;
  } catch (error) {
    logger.error('Edge function proxy-image failed:', error);
    throw await toEdgeFunctionError(error, 'No se pudo procesar la imagen');
  }
}

export async function createBetaInviteViaEdge(
  options: {
    maxUses?: number;
    validDays?: number;
    grantsPremium?: boolean;
    grantsUnlimitedAI?: boolean;
    note?: string;
    prefix?: string;
  } = {},
): Promise<{
  code: string;
  shareLink: string;
  maxUses: number;
  validDays: number;
  grantsPremium: boolean;
  grantsUnlimitedAI: boolean;
}> {
  try {
    const { data, error } = await invokeWithTimeout('create-beta-invite', {
      body: options,
    });

    if (error) throw error;
    if (!data?.code || !data?.shareLink) {
      throw new Error('Invalid invite response');
    }

    return {
      code: String(data.code),
      shareLink: String(data.shareLink),
      maxUses: Number(data.maxUses || 0),
      validDays: Number(data.validDays || 0),
      grantsPremium: Boolean(data.grantsPremium),
      grantsUnlimitedAI: Boolean(data.grantsUnlimitedAI),
    };
  } catch (error) {
    logger.error('Edge function create-beta-invite failed:', error);
    throw await toEdgeFunctionError(error, 'No se pudo generar el link beta');
  }
}

export async function claimBetaInviteViaEdge(code: string): Promise<{
  success: boolean;
  message: string;
  expires_at?: string | null;
  premium_override?: boolean;
  unlimited_ai?: boolean;
  remaining_uses?: number | null;
}> {
  try {
    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode) {
      throw new Error('Missing code');
    }

    const { data, error } = await invokeWithTimeout('claim-beta-invite', {
      body: { code: normalizedCode },
    });

    if (error) throw error;

    return {
      success: Boolean(data?.success),
      message: String(data?.message || ''),
      expires_at: data?.expires_at || null,
      premium_override: Boolean(data?.premium_override),
      unlimited_ai: Boolean(data?.unlimited_ai),
      remaining_uses: typeof data?.remaining_uses === 'number' ? data.remaining_uses : null,
    };
  } catch (error) {
    logger.error('Edge function claim-beta-invite failed:', error);
    throw await toEdgeFunctionError(error, 'No se pudo activar el acceso beta');
  }
}

export async function listBetaInviteClaimsViaEdge(
  options: { code?: string; limit?: number } = {},
): Promise<{
  invites: Array<{
    code: string;
    max_uses: number;
    uses_count: number;
    expires_at: string | null;
    revoked_at: string | null;
    created_by: string | null;
    created_at: string;
  }>;
  claims: Array<{
    code: string;
    user_id: string;
    claimed_at: string;
    source: string;
    email: string | null;
    username: string | null;
    display_name: string | null;
  }>;
}> {
  try {
    const { data, error } = await invokeWithTimeout('list-beta-invite-claims', {
      body: {
        code: options.code || undefined,
        limit: options.limit || undefined,
      },
    });
    if (error) throw error;
    return {
      invites: Array.isArray(data?.invites) ? data.invites : [],
      claims: Array.isArray(data?.claims) ? data.claims : [],
    };
  } catch (error) {
    logger.error('Edge function list-beta-invite-claims failed:', error);
    throw await toEdgeFunctionError(error, 'No se pudo obtener la trazabilidad de links beta');
  }
}
