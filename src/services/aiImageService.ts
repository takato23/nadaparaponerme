import { supabase } from '../lib/supabase';
import { getFeatureFlag } from '../config/features';
import { addGeneratedClothingItem } from './closetService';
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  AIGeneratedImage,
  DailyGenerationQuota,
} from '../types/api';

type EdgeInvokeErrorPayload = {
  error?: string;
  message?: string;
  error_code?: string;
  code?: string;
};

async function getEdgeInvokeErrorPayload(error: any): Promise<EdgeInvokeErrorPayload | null> {
  const context = error?.context;
  if (!context || typeof context.json !== 'function') return null;
  try {
    const payload = await context.json();
    if (payload && typeof payload === 'object') {
      return payload as EdgeInvokeErrorPayload;
    }
  } catch {
    // noop
  }
  return null;
}

function mapGenerateImageErrorCode(errorCode?: string, fallbackMessage?: string): string {
  switch (errorCode) {
    case 'QUOTA_EXCEEDED':
    case 'DAILY_BUDGET_LIMIT':
      return fallbackMessage || 'No tenés créditos suficientes para generar esta prenda. Hacé upgrade para continuar.';
    case 'RATE_LIMIT':
      return fallbackMessage || 'Demasiadas solicitudes. Esperá un momento e intentá nuevamente.';
    case 'INVALID_PROMPT':
      return fallbackMessage || 'El prompt contiene contenido no permitido.';
    case 'AUTH_REQUIRED':
    case 'INVALID_TOKEN':
      return 'Tu sesión venció. Iniciá sesión nuevamente.';
    case 'API_ERROR':
      return fallbackMessage || 'Error en la API de generación de imágenes.';
    case 'NETWORK_ERROR':
      return fallbackMessage || 'Error de conexión. Verificá tu internet.';
    default:
      return fallbackMessage || 'Error desconocido al generar imagen';
  }
}

/**
 * AI Image Generation Service
 * Frontend service layer for managing AI-generated fashion images
 */

export const aiImageService = {
  /**
   * Generate fashion image via Supabase Edge Function
   */
  async generateFashionImage(
    prompt: string,
    stylePreferences?: GenerateImageRequest['style_preferences']
  ): Promise<GenerateImageResponse> {
    // Validate prompt
    if (!prompt.trim()) {
      throw new Error('El prompt no puede estar vacío');
    }

    if (prompt.trim().length < 10) {
      throw new Error('El prompt debe tener al menos 10 caracteres');
    }

    // TEMPORALMENTE DESHABILITADO: Check quota
    // TODO: Re-habilitar cuando las tablas de database estén funcionando
    // const quotaCheck = await this.checkDailyQuota();
    // if (quotaCheck.remaining <= 0) {
    //   throw new Error(
    //     `Has alcanzado tu límite diario de ${quotaCheck.limit} créditos. Volvé mañana o actualiza a Premium.`
    //   );
    // }

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Debes iniciar sesión para generar imágenes');
      }

      // Call Edge Function with auth header
      const { data, error } = await supabase.functions.invoke(
        'generate-fashion-image',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            prompt: prompt.trim(),
            style_preferences: stylePreferences,
          },
        }
      );

      if (error) {
        console.error('Edge Function error:', error);
        const payload = await getEdgeInvokeErrorPayload(error);
        const errorCode = payload?.error_code || payload?.code;
        const mappedMessage = mapGenerateImageErrorCode(errorCode, payload?.error || payload?.message || error.message);
        throw new Error(mappedMessage);
      }

      if (!data) {
        throw new Error('No se recibió respuesta del servidor');
      }

      const typedData = data as GenerateImageResponse;

      if (!typedData.success) {
        // Handle specific error codes
        throw new Error(
          mapGenerateImageErrorCode(typedData.error_code, typedData.error),
        );
      }

      return typedData;
    } catch (error) {
      console.error('Generate image error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error inesperado al generar la imagen');
    }
  },

  /**
   * Check daily generation quota
   */
  async checkDailyQuota(): Promise<{
    remaining: number;
    limit: number;
    plan_type: string;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Query daily_generation_quota table
      const { data, error } = await supabase
        .from('daily_generation_quota')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (expected on first query of the day)
        console.error('Quota check error:', error);
        throw error;
      }

      // If no quota record exists for today, return defaults based on plan
      if (!data) {
        return {
          remaining: 3, // Free tier default
          limit: 3,
          plan_type: 'free',
        };
      }

      // Calculate remaining
      const quota = data as DailyGenerationQuota;
      const flashRemaining = Math.max(0, 3 - quota.flash_count); // Free: 3 flash/day
      const proRemaining = quota.plan_type === 'free' ? 0 : Math.max(0, 10 - quota.pro_count); // Pro: 10 pro/day

      return {
        remaining: flashRemaining + proRemaining,
        limit: quota.plan_type === 'free' ? 3 : 13, // Free: 3, Pro+: 13 (3 flash + 10 pro)
        plan_type: quota.plan_type,
      };
    } catch (error) {
      console.error('Check quota error:', error);
      // Return defaults on error to allow continuation
      return {
        remaining: 3,
        limit: 3,
        plan_type: 'free',
      };
    }
  },

  /**
   * Get generation history
   */
  async getGenerationHistory(limit = 20): Promise<AIGeneratedImage[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return []; // Return empty if not authenticated
      }

      const { data, error } = await supabase
        .from('ai_generated_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Get history error:', error);
        // Return empty array on table missing (graceful degradation)
        if (error.code === '42P01') {
          // Table doesn't exist
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Get generation history error:', error);
      return []; // Graceful degradation
    }
  },

  /**
   * Save generated image to closet (localStorage)
   */
  async saveToCloset(
    imageUrl: string,
    prompt: string,
    metadata?: GenerateImageRequest['style_preferences']
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const itemMetadata = {
        category: metadata?.category || 'top',
        subcategory: 'AI Generated Item',
        color_primary: '#000000',
        vibe_tags: ['ai-generated'],
        seasons: metadata?.season
          ? [metadata.season]
          : ['spring', 'summer', 'fall', 'winter'],
        description: prompt,
      };

      const useSupabaseCloset = getFeatureFlag('useSupabaseCloset');

      if (useSupabaseCloset && user) {
        await addGeneratedClothingItem(imageUrl, itemMetadata, 'owned');
      } else {
        // Fallback legacy mode
        const closetJson = localStorage.getItem('ojodeloca-closet');
        const closet = closetJson ? JSON.parse(closetJson) : [];

        const newItem = {
          id: `ai-${Date.now()}`,
          imageDataUrl: imageUrl,
          metadata: itemMetadata,
          isAIGenerated: true,
          aiGenerationPrompt: prompt,
        };

        closet.push(newItem);
        localStorage.setItem('ojodeloca-closet', JSON.stringify(closet));
      }

      if (user) {
        // Find the generation record by image_url
        const { data: generations } = await supabase
          .from('ai_generated_images')
          .select('id')
          .eq('user_id', user.id)
          .eq('image_url', imageUrl)
          .limit(1);

        if (generations && generations.length > 0) {
          // Update added_to_closet flag
          await supabase
            .from('ai_generated_images')
            .update({ added_to_closet: true })
            .eq('id', generations[0].id);
        }
      }
    } catch (error) {
      console.error('Save to closet error:', error);
      throw new Error('Error al guardar la imagen en tu armario');
    }
  },

  /**
   * Delete a generated image from history
   */
  async deleteGeneration(generationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_generated_images')
        .delete()
        .eq('id', generationId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete generation error:', error);
      throw new Error('Error al eliminar la imagen');
    }
  },
};
