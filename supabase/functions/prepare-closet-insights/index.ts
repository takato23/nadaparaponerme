import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, Type } from 'npm:@google/genai@1.27.0';
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import { enforceAIBudgetGuard, getBudgetLimitMessage, recordAIBudgetSuccess } from '../_shared/aiBudgetGuard.ts';
import { withRetry } from '../_shared/retry.ts';
import { blobToDataUrl, parseClothingStoragePath } from '../_shared/insightUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

const MAX_ITEMS_PER_PREPARE = 6;
const AI_METADATA_VERSION = 1;

const clothingItemSchema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING },
    subcategory: { type: Type.STRING },
    color_primary: { type: Type.STRING },
    neckline: { type: Type.STRING },
    sleeve_type: { type: Type.STRING },
    vibe_tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    seasons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['category', 'subcategory', 'color_primary', 'vibe_tags', 'seasons'],
};

type InsightType = 'mix' | 'chat' | 'report';

type ClothingItemRow = {
  id: string;
  image_url: string;
  category: string | null;
  subcategory: string | null;
  color_primary: string | null;
  ai_metadata: Record<string, any> | null;
  tags: string[] | null;
  ai_status: 'pending' | 'processing' | 'ready' | 'failed' | null;
  ai_metadata_version: number | null;
};

function isInsightType(value: unknown): value is InsightType {
  return value === 'mix' || value === 'chat' || value === 'report';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function hasUsefulMetadata(item: ClothingItemRow): boolean {
  const meta = item.ai_metadata || {};
  const hasVibes = normalizeStringArray(meta.vibe_tags).length > 0;
  const hasSeasons = normalizeStringArray(meta.seasons).length > 0;
  const hasColor = typeof item.color_primary === 'string' && item.color_primary.trim().length > 0;
  const hasSubcategory = typeof item.subcategory === 'string' && item.subcategory.trim().length > 0;
  const hasCategory = typeof item.category === 'string' && item.category.trim().length > 0;

  return hasVibes && hasSeasons && hasColor && hasSubcategory && hasCategory;
}

function requiresAnalysis(item: ClothingItemRow): boolean {
  if (item.ai_status === 'processing') return false;
  if (item.ai_status === 'pending' || item.ai_status === 'failed') return true;
  if ((item.ai_metadata_version || 0) < AI_METADATA_VERSION) return true;
  return !hasUsefulMetadata(item);
}

function computeCoverage(items: ClothingItemRow[]): { top: number; bottom: number; shoes: number } {
  return items.reduce(
    (acc, item) => {
      if (item.category === 'top') acc.top += 1;
      if (item.category === 'bottom') acc.bottom += 1;
      if (item.category === 'shoes') acc.shoes += 1;
      return acc;
    },
    { top: 0, bottom: 0, shoes: 0 },
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabase: any = null;
  let userId: string | null = null;

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    userId = user.id;

    const rateLimit = await enforceRateLimit(supabase, user.id, 'prepare-closet-insights', {
      maxRequests: 8,
      windowSeconds: 60,
    });
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Demasiadas solicitudes. Esperá un momento e intentá nuevamente.' }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfterSeconds || 60),
          },
        },
      );
    }

    const { insightType, prompt, closetItemIds } = await req.json();
    if (!isInsightType(insightType)) {
      return new Response(
        JSON.stringify({ error: 'insightType inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const sanitizedIds = Array.isArray(closetItemIds)
      ? closetItemIds.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
      : [];

    let query = supabase
      .from('clothing_items')
      .select('id, image_url, category, subcategory, color_primary, ai_metadata, tags, ai_status, ai_metadata_version')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (sanitizedIds.length > 0) {
      query = query.in('id', sanitizedIds);
    }

    const { data: closetItems, error: closetError } = await query;
    if (closetError) {
      throw closetError;
    }

    const items = (closetItems || []) as ClothingItemRow[];
    if (items.length === 0) {
      return new Response(
        JSON.stringify({
          ready: false,
          missingCount: 0,
          processingCount: 0,
          estimatedSeconds: 0,
          coverage: { top: 0, bottom: 0, shoes: 0 },
          analyzedCount: 0,
          failedCount: 0,
          insightType,
          credits_used: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const pendingItems = items.filter(requiresAnalysis);
    const itemsToAnalyze = pendingItems.slice(0, MAX_ITEMS_PER_PREPARE);
    const remainingPending = Math.max(0, pendingItems.length - itemsToAnalyze.length);

    if (itemsToAnalyze.length > 0) {
      const budgetGuard = await enforceAIBudgetGuard(supabase, user.id, 'prepare-closet-insights', 0);
      if (!budgetGuard.allowed) {
        return new Response(
          JSON.stringify({ error: getBudgetLimitMessage(budgetGuard.reason) }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(budgetGuard.retryAfterSeconds || 60),
            },
          },
        );
      }
    }

    if (itemsToAnalyze.length > 0) {
      const ids = itemsToAnalyze.map((item) => item.id);
      await supabase
        .from('clothing_items')
        .update({ ai_status: 'processing', ai_last_error: null })
        .in('id', ids)
        .eq('user_id', user.id);
    }

    let analyzedCount = 0;
    let failedCount = 0;

    for (const item of itemsToAnalyze) {
      try {
        const storagePath = parseClothingStoragePath(item.image_url);
        if (!storagePath) {
          throw new Error('No se pudo resolver la ruta de la imagen');
        }

        const { data: imageBlob, error: downloadError } = await supabase.storage
          .from('clothing-images')
          .download(storagePath);
        if (downloadError || !imageBlob) {
          throw new Error(downloadError?.message || 'No se pudo descargar la imagen');
        }

        const imageDataUrl = await blobToDataUrl(imageBlob);
        const [mimeTypePart, base64Data] = imageDataUrl.split(';base64,');
        const mimeType = mimeTypePart.split(':')[1];
        if (!base64Data || !mimeType) {
          throw new Error('Formato de imagen inválido');
        }

        const response = await withRetry(() =>
          ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType,
                  },
                },
              ],
            },
            config: {
              systemInstruction:
                'Analiza una prenda de ropa y devuelve categoría, subcategoría, color principal, cuello, manga, tags de estilo y temporadas.',
              responseMimeType: 'application/json',
              responseSchema: clothingItemSchema,
            },
          }),
        );

        const analysis = JSON.parse(response.text || '{}');
        const mergedAiMetadata = {
          ...(item.ai_metadata || {}),
          neckline: analysis.neckline || null,
          sleeve_type: analysis.sleeve_type || null,
          vibe_tags: normalizeStringArray(analysis.vibe_tags),
          seasons: normalizeStringArray(analysis.seasons),
        };

        await supabase
          .from('clothing_items')
          .update({
            category: analysis.category || item.category || 'top',
            subcategory: analysis.subcategory || item.subcategory || 'prenda',
            color_primary: analysis.color_primary || item.color_primary || 'desconocido',
            ai_metadata: mergedAiMetadata,
            tags: normalizeStringArray(analysis.vibe_tags),
            ai_status: 'ready',
            ai_analyzed_at: new Date().toISOString(),
            ai_metadata_version: AI_METADATA_VERSION,
            ai_last_error: null,
          })
          .eq('id', item.id)
          .eq('user_id', user.id);

        analyzedCount += 1;
      } catch (itemError) {
        failedCount += 1;
        await supabase
          .from('clothing_items')
          .update({
            ai_status: 'failed',
            ai_last_error: itemError instanceof Error ? itemError.message.slice(0, 300) : 'unknown_error',
          })
          .eq('id', item.id)
          .eq('user_id', user.id);
      }
    }

    const { data: refreshedItems, error: refreshError } = await supabase
      .from('clothing_items')
      .select('id, category, ai_status, ai_metadata, ai_metadata_version, subcategory, color_primary, image_url, tags')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .in('id', items.map((item) => item.id));

    if (refreshError) {
      throw refreshError;
    }

    const updatedItems = (refreshedItems || []) as ClothingItemRow[];
    const coverage = computeCoverage(updatedItems);
    const missingCount = updatedItems.filter(requiresAnalysis).length;
    const ready = coverage.top > 0 && coverage.bottom > 0 && coverage.shoes > 0;

    if (itemsToAnalyze.length > 0) {
      await recordAIBudgetSuccess(supabase, user.id, 'prepare-closet-insights', 0);
    }

    await recordRequestResult(supabase, user.id, 'prepare-closet-insights', true);

    return new Response(
      JSON.stringify({
        ready,
        missingCount,
        processingCount: remainingPending,
        estimatedSeconds: missingCount > 0 ? Math.min(45, missingCount * 4) : 0,
        coverage,
        analyzedCount,
        failedCount,
        insightType,
        prompt: typeof prompt === 'string' ? prompt : null,
        credits_used: 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in prepare-closet-insights:', error);
    if (supabase && userId) {
      await recordRequestResult(supabase, userId, 'prepare-closet-insights', false);
    }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to prepare closet insights' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
