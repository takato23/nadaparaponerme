// Supabase Edge Function: Generate Outfit with Gemini AI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, Type } from 'npm:@google/genai@1.27.0';
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import { enforceAIBudgetGuard, getBudgetLimitMessage, recordAIBudgetSuccess } from '../_shared/aiBudgetGuard.ts';
import { withRetry } from '../_shared/retry.ts';
import { buildClosetHash, buildPromptHash, sanitizeIdempotencyKey } from '../_shared/insightUtils.ts';
import { assertAllowedOrigin, getRequestId, isFailClosedHighCostEnabled, jsonError } from '../_shared/security.ts';

const MONTH_SECONDS = 60 * 60 * 24 * 30;
const getMonthlyLimit = (envName: string, fallback: number) => {
  const raw = Deno.env.get(envName);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

const INSIGHT_TYPE = 'mix';
const CREDIT_COST = 1;
const CACHE_TTL_HOURS = 12;

type OutfitResponsePayload = {
  top_id: string;
  bottom_id: string;
  shoes_id: string;
  explanation: string;
  missing_piece_suggestion?: {
    item_name: string;
    reason: string;
  };
};

const normalizeCategory = (item: any): string => {
  const direct = String(item?.category || '').trim().toLowerCase();
  if (direct) return direct;
  return String(item?.ai_metadata?.category || '').trim().toLowerCase();
};

const validateOutfitPayload = (
  raw: unknown,
  inventory: any[],
): { ok: true; outfit: OutfitResponsePayload } | { ok: false; error: string } => {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'La IA devolvió una respuesta inválida.' };
  }

  const payload = raw as Record<string, unknown>;
  const topId = typeof payload.top_id === 'string' ? payload.top_id.trim() : '';
  const bottomId = typeof payload.bottom_id === 'string' ? payload.bottom_id.trim() : '';
  const shoesId = typeof payload.shoes_id === 'string' ? payload.shoes_id.trim() : '';
  const explanation = typeof payload.explanation === 'string' ? payload.explanation.trim() : '';

  if (!topId || !bottomId || !shoesId || !explanation) {
    return { ok: false, error: 'La IA devolvió un outfit incompleto.' };
  }
  if (topId === bottomId || topId === shoesId || bottomId === shoesId) {
    return { ok: false, error: 'La IA devolvió IDs repetidos para distintas prendas.' };
  }

  const byId = new Map(inventory.map((item) => [String(item.id), item]));
  const topItem = byId.get(topId);
  const bottomItem = byId.get(bottomId);
  const shoesItem = byId.get(shoesId);
  if (!topItem || !bottomItem || !shoesItem) {
    return { ok: false, error: 'La IA devolvió IDs que no existen en el inventario disponible.' };
  }

  if (normalizeCategory(topItem) !== 'top') {
    return { ok: false, error: 'La IA devolvió una prenda superior inválida para top_id.' };
  }
  if (normalizeCategory(bottomItem) !== 'bottom') {
    return { ok: false, error: 'La IA devolvió una prenda inferior inválida para bottom_id.' };
  }
  if (normalizeCategory(shoesItem) !== 'shoes') {
    return { ok: false, error: 'La IA devolvió una prenda inválida para shoes_id.' };
  }

  const outfit: OutfitResponsePayload = {
    top_id: topId,
    bottom_id: bottomId,
    shoes_id: shoesId,
    explanation,
  };

  const missingPieceSuggestion = payload.missing_piece_suggestion;
  if (missingPieceSuggestion && typeof missingPieceSuggestion === 'object') {
    const itemName = typeof (missingPieceSuggestion as Record<string, unknown>).item_name === 'string'
      ? ((missingPieceSuggestion as Record<string, unknown>).item_name as string).trim()
      : '';
    const reason = typeof (missingPieceSuggestion as Record<string, unknown>).reason === 'string'
      ? ((missingPieceSuggestion as Record<string, unknown>).reason as string).trim()
      : '';
    if (itemName && reason) {
      outfit.missing_piece_suggestion = { item_name: itemName, reason };
    }
  }

  return { ok: true, outfit };
};

serve(async (req) => {
  const requestId = getRequestId(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'X-Request-Id': requestId } });
  }

  let supabase: any = null;
  let userId: string | null = null;
  let idempotencyKey: string | null = null;
  let promptHash: string | null = null;
  let closetHash: string | null = null;

  try {
    const originCheck = assertAllowedOrigin(req, { requireConfigured: true });
    if (!originCheck.allowed) {
      return jsonError({
        status: originCheck.missingConfig ? 503 : 403,
        requestId,
        error: originCheck.missingConfig ? 'ALLOWED_WEB_ORIGINS no está configurado' : 'Origen no permitido',
        code: originCheck.missingConfig ? 'security_guard_error' : 'forbidden_origin',
        corsHeaders,
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

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

    const allowlistRaw = Deno.env.get('BETA_ALLOWLIST_EMAILS');
    if (allowlistRaw) {
      const email = (user.email || '').toLowerCase().trim();
      const allowed = allowlistRaw
        .split(',')
        .map((e) => e.toLowerCase().trim())
        .filter(Boolean);
      if (!email || !allowed.includes(email)) {
        return new Response(
          JSON.stringify({ error: 'Beta cerrada: tu cuenta no está habilitada todavía.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const monthlyLimit = getMonthlyLimit('BETA_MONTHLY_OUTFIT_LIMIT', 100);
    if (monthlyLimit > 0) {
      const monthlyCap = await enforceRateLimit(supabase, user.id, 'beta-outfit-monthly', {
        windowSeconds: MONTH_SECONDS,
        maxRequests: monthlyLimit,
      });
      if (!monthlyCap.allowed) {
        return new Response(
          JSON.stringify({ error: 'Límite mensual de outfits alcanzado. Probá de nuevo el próximo mes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const rateLimit = await enforceRateLimit(supabase, user.id, 'generate-outfit');
    if (rateLimit.guardError && isFailClosedHighCostEnabled()) {
      return new Response(
        JSON.stringify({ error: 'Security guard unavailable. Try again shortly.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!rateLimit.allowed) {
      const retryAfter = rateLimit.retryAfterSeconds || 60;
      const message = rateLimit.reason === 'blocked'
        ? 'Detectamos muchos errores seguidos. Espera unos minutos antes de intentar de nuevo.'
        : 'Demasiadas solicitudes en poco tiempo. Espera un momento y reintenta.';
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        },
      );
    }

    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt : '';
    const customSystemPromptRaw = typeof body?.systemPrompt === 'string' ? body.systemPrompt.trim() : '';
    const requestedClosetItemIds = Array.isArray(body?.closetItemIds)
      ? Array.from(
        new Set(
          body.closetItemIds
            .filter((itemId: unknown) => typeof itemId === 'string')
            .map((itemId: string) => itemId.trim())
            .filter(Boolean),
        ),
      )
      : [];
    const customResponseSchema = body?.responseSchema && typeof body.responseSchema === 'object' && !Array.isArray(body.responseSchema)
      ? body.responseSchema
      : null;
    if (!prompt.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (customSystemPromptRaw.length > 12_000) {
      return new Response(
        JSON.stringify({ error: 'systemPrompt too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (customResponseSchema && JSON.stringify(customResponseSchema).length > 20_000) {
      return new Response(
        JSON.stringify({ error: 'responseSchema too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const customSystemPrompt = customSystemPromptRaw || null;

    idempotencyKey = sanitizeIdempotencyKey(body?.idempotencyKey);
    const promptHashSource = customSystemPrompt
      ? `${prompt}\n\n${customSystemPrompt}\n\n${JSON.stringify(customResponseSchema || {})}\n\n${requestedClosetItemIds.join(',')}`
      : `${prompt}\n\n${JSON.stringify(customResponseSchema || {})}\n\n${requestedClosetItemIds.join(',')}`;
    promptHash = await buildPromptHash(promptHashSource);

    if (idempotencyKey) {
      const { data: existingJob, error: existingJobError } = await supabase
        .from('ai_insight_jobs')
        .select('status, response_json')
        .eq('user_id', user.id)
        .eq('insight_type', INSIGHT_TYPE)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (!existingJobError && existingJob?.status === 'success' && existingJob?.response_json) {
        return new Response(
          JSON.stringify({
            ...existingJob.response_json,
            credits_used: 0,
            idempotent: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    let itemsQuery = supabase
      .from('clothing_items')
      .select('id, name, category, subcategory, color_primary, ai_metadata, tags, ai_status, ai_metadata_version, updated_at')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (requestedClosetItemIds.length > 0) {
      itemsQuery = itemsQuery.in('id', requestedClosetItemIds);
    }

    const { data: items, error: itemsError } = await itemsQuery;

    if (itemsError) throw itemsError;
    if (requestedClosetItemIds.length > 0) {
      const foundIds = new Set((items || []).map((item: any) => String(item.id)));
      const missingIds = requestedClosetItemIds.filter((itemId) => !foundIds.has(itemId));
      if (missingIds.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Algunas prendas seleccionadas no existen o no están disponibles.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }
    if (!items || items.length < 3) {
      return new Response(
        JSON.stringify({
          error: 'No hay suficientes prendas en tu armario. Añade al menos un top, un pantalón y un par de zapatos.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    closetHash = await buildClosetHash(items);

    const { data: cachedInsight, error: cacheError } = await supabase
      .from('ai_insight_cache')
      .select('id, response_json, hit_count')
      .eq('user_id', user.id)
      .eq('insight_type', INSIGHT_TYPE)
      .eq('closet_hash', closetHash)
      .eq('prompt_hash', promptHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!cacheError && cachedInsight?.response_json) {
      await supabase
        .from('ai_insight_cache')
        .update({
          hit_count: (cachedInsight.hit_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cachedInsight.id);

      if (idempotencyKey) {
        await supabase.from('ai_insight_jobs').upsert(
          {
            user_id: user.id,
            insight_type: INSIGHT_TYPE,
            idempotency_key: idempotencyKey,
            status: 'success',
            prompt_hash: promptHash,
            closet_hash: closetHash,
            request_json: { prompt, source: 'generate-outfit', closetItemIds: requestedClosetItemIds },
            response_json: cachedInsight.response_json,
            credits_used: 0,
          },
          { onConflict: 'user_id,insight_type,idempotency_key' },
        );
      }

      return new Response(
        JSON.stringify({
          ...cachedInsight.response_json,
          credits_used: 0,
          cache_hit: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const budgetGuard = await enforceAIBudgetGuard(supabase, user.id, 'generate-outfit', CREDIT_COST);
    if (budgetGuard.guardError && isFailClosedHighCostEnabled()) {
      return new Response(
        JSON.stringify({ error: 'Budget guard unavailable. Try again shortly.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
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

    const { data: canGenerate, error: canGenerateError } = await supabase.rpc('can_user_generate_outfit', {
      p_user_id: user.id,
      p_amount: CREDIT_COST,
    });
    if (canGenerateError) {
      console.error('Error checking generation quota:', canGenerateError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar tu límite. Intentá de nuevo.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!canGenerate) {
      return new Response(
        JSON.stringify({ error: 'Has alcanzado tu límite de créditos. Upgradeá tu plan para continuar.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const fitResultSchema = {
      type: Type.OBJECT,
      properties: {
        top_id: { type: Type.STRING },
        bottom_id: { type: Type.STRING },
        shoes_id: { type: Type.STRING },
        explanation: { type: Type.STRING },
        missing_piece_suggestion: {
          type: Type.OBJECT,
          properties: {
            item_name: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ['item_name', 'reason'],
        },
      },
      required: ['top_id', 'bottom_id', 'shoes_id', 'explanation'],
    };

    const defaultSystemInstruction = `Eres un estilista personal con un 'ojo de loca' para la moda. Tienes acceso al siguiente inventario de ropa: ${JSON.stringify(
      items,
    )}. El usuario quiere un outfit para: "${prompt}".
Selecciona la mejor combinación (Top + Bottom + Shoes) del inventario.
Si falta una pieza clave, puedes sugerir una en 'missing_piece_suggestion'.
Devuelve siempre JSON con IDs válidos del inventario.`;

    const systemInstruction = customSystemPrompt
      ? `${customSystemPrompt}

INVENTARIO DISPONIBLE:
${JSON.stringify(items)}

REGLAS OPERATIVAS:
- Selecciona la mejor combinación (Top + Bottom + Shoes) del inventario.
- Si falta una pieza clave, puedes sugerir una en 'missing_piece_suggestion'.
- Devuelve siempre JSON con IDs válidos del inventario.`
      : defaultSystemInstruction;

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: { parts: [{ text: `Aquí está la petición del usuario: "${prompt}"` }] },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: customResponseSchema || fitResultSchema,
        },
      }),
    );

    let parsedOutfitRaw: unknown = null;
    try {
      parsedOutfitRaw = JSON.parse(response.text || '{}');
    } catch {
      return new Response(
        JSON.stringify({ error: 'La IA devolvió una respuesta no JSON.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const validation = validateOutfitPayload(parsedOutfitRaw, items);
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const outfit = validation.outfit;
    const { data: incremented, error: incrementError } = await supabase.rpc('increment_ai_generation_usage', {
      p_user_id: user.id,
      p_amount: CREDIT_COST,
    });
    if (incrementError) {
      console.error('Failed to increment usage:', incrementError);
    }

    await recordAIBudgetSuccess(supabase, user.id, 'generate-outfit', incremented ? CREDIT_COST : 0);

    const payload = {
      ...outfit,
      model: 'gemini-3.1-flash-lite-preview',
      credits_used: incremented ? CREDIT_COST : 0,
      cache_hit: false,
    };

    await supabase.from('ai_insight_cache').upsert(
      {
        user_id: user.id,
        insight_type: INSIGHT_TYPE,
        closet_hash: closetHash,
        prompt_hash: promptHash,
        response_json: payload,
        model: 'gemini-3.1-flash-lite-preview',
        credits_used: incremented ? CREDIT_COST : 0,
        expires_at: new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'user_id,insight_type,closet_hash,prompt_hash' },
    );

    if (idempotencyKey) {
      await supabase.from('ai_insight_jobs').upsert(
        {
          user_id: user.id,
          insight_type: INSIGHT_TYPE,
          idempotency_key: idempotencyKey,
          status: 'success',
          prompt_hash: promptHash,
          closet_hash: closetHash,
          request_json: { prompt, source: 'generate-outfit', closetItemIds: requestedClosetItemIds },
          response_json: payload,
          credits_used: incremented ? CREDIT_COST : 0,
        },
        { onConflict: 'user_id,insight_type,idempotency_key' },
      );
    }

    await recordRequestResult(supabase, user.id, 'generate-outfit', true);

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating outfit:', error);
    if (supabase && userId) {
      await recordRequestResult(supabase, userId, 'generate-outfit', false);
      if (idempotencyKey) {
        await supabase.from('ai_insight_jobs').upsert(
          {
            user_id: userId,
            insight_type: INSIGHT_TYPE,
            idempotency_key: idempotencyKey,
            status: 'failed',
            prompt_hash: promptHash,
            closet_hash: closetHash,
            error_text: error instanceof Error ? error.message : 'unknown_error',
          },
          { onConflict: 'user_id,insight_type,idempotency_key' },
        );
      }
    }
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate outfit',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
