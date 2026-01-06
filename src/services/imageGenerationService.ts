/**
 * Image Generation Service
 * Service layer for AI-powered fashion image generation using Gemini AI
 */

import { supabase } from '../lib/supabase';

export interface GenerateImageRequest {
  prompt: string;
  model_type?: 'flash' | 'pro';
  style_preferences?: {
    background?: string;
    lighting?: string;
    mood?: string;
    [key: string]: string | undefined;
  };
  input_images?: string[]; // Array of clothing item URLs
  user_base_image?: string; // URL of the user's base photo for virtual try-on
}

export interface GenerateImageResponse {
  image_url: string;
  storage_path: string;
  generation_time_ms: number;
  remaining_quota: number;
  model_used: 'flash' | 'pro';
  current_tier: string;
}

export interface QuotaExceededError {
  error: string;
  error_code: 'QUOTA_EXCEEDED';
  remaining_quota: 0;
  current_tier: string;
  upgrade_prompt: boolean;
  message: string;
}

export interface QuotaStatus {
  current_count: number;
  daily_limit: number;
  remaining_quota: number;
  plan_type: string;
  can_generate: boolean;
}

/**
 * Generate a fashion image using Gemini AI
 *
 * @throws {Error} If quota is exceeded or generation fails
 */
export async function generateFashionImage(
  request: GenerateImageRequest
): Promise<GenerateImageResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No estás autenticado. Inicia sesión para generar imágenes.');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-fashion-image`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    const result = await response.json();

    // Handle quota exceeded
    if (response.status === 429) {
      const quotaError = result as QuotaExceededError;
      throw new Error(quotaError.message);
    }

    // Handle other errors
    if (!response.ok) {
      throw new Error(result.error || 'Error al generar imagen');
    }

    return result as GenerateImageResponse;
  } catch (error) {
    console.error('Image generation error:', error);
    throw error instanceof Error ? error : new Error('Error desconocido al generar imagen');
  }
}

/**
 * Check user's current quota status for a specific model
 */
export async function getQuotaStatus(
  modelType: 'flash' | 'pro' = 'flash'
): Promise<QuotaStatus> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('No estás autenticado');
    }

    const { data, error } = await (supabase.rpc as any)('get_user_quota_status', {
      p_user_id: user.id,
      p_model_type: modelType,
    });

    if (error) throw error;

    if (!data || !data[0]) {
      throw new Error('No quota data found');
    }

    return data[0] as QuotaStatus;
  } catch (error) {
    console.error('Quota status error:', error);
    throw error instanceof Error ? error : new Error('Error al obtener estado de cuota');
  }
}

/**
 * Get user's generated images history
 */
export async function getGeneratedImages(limit = 20): Promise<Array<{
  id: string;
  prompt: string;
  image_url: string;
  model_type: 'flash' | 'pro';
  generation_time_ms: number;
  created_at: string;
}>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('No estás autenticado');
    }

    const { data, error } = await (supabase
      .from('ai_generated_images' as any)
      .select('id, prompt, image_url, model_type, generation_time_ms, created_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit) as any);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Get generated images error:', error);
    return [];
  }
}

/**
 * Delete a generated image (soft delete)
 */
export async function deleteGeneratedImage(imageId: string): Promise<void> {
  try {
    const { error } = await (supabase.from('ai_generated_images') as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', imageId);

    if (error) throw error;
  } catch (error) {
    console.error('Delete generated image error:', error);
    throw error instanceof Error ? error : new Error('Error al eliminar imagen');
  }
}

/**
 * Get model limits based on subscription tier
 */
export function getModelLimits(tier: 'free' | 'pro' | 'premium'): {
  flash: number;
  pro: number;
} {
  const limits = {
    free: { flash: 10, pro: 0 },
    pro: { flash: 50, pro: 5 },
    premium: { flash: 200, pro: 20 },
  };

  return limits[tier];
}

/**
 * Format generation time for display
 */
export function formatGenerationTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Get recommended model based on tier
 */
export function getRecommendedModel(tier: 'free' | 'pro' | 'premium'): 'flash' | 'pro' {
  if (tier === 'free') return 'flash';
  if (tier === 'pro') return 'flash';
  return 'pro';
}
/**
 * Helper to build a "High Fidelity" prompt that prioritizes texture and detail preservation.
 */
export function buildHighFidelityPrompt(
  itemDescription: string,
  context: string,
  baseBodyDescription: string = 'person'
): string {
  // Strategic repetition of key details to force attention ("Texture Lock")
  const textureLock = `wearing exactly (${itemDescription}). The fabric texture, pattern, logos, and details of the (${itemDescription}) MUST BE PRESERVED precisely.`;

  const negativePrompt = 'startified, distorted details, wrong fabric, blurry texture, altered logo, morphing, extra limbs, bad anatomy';

  return `
    Fashion photography, 8k, highly detailed.
    Subject: A realistic ${baseBodyDescription} ${textureLock}
    Environment: ${context}.
    Lighting: Cinematic, professional fashion lighting.
    Quality: Best quality, photorealistic, sharp focus.
    Target: Fit the clothing item naturally onto the subject's body pose while keeping the item's visual identity 100% intact.
    --no ${negativePrompt}
  `.trim().replace(/\s+/g, ' ');
}
