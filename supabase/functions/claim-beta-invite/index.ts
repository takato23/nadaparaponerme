import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import {
  assertAllowedOrigin,
  getRequestId,
  isFailClosedHighCostEnabled,
  jsonError,
  parsePositiveIntEnv,
} from '../_shared/security.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};
const CLAIM_RATE_LIMIT_PER_MIN = parsePositiveIntEnv('RATE_LIMIT_CLAIM_BETA_PER_MIN', 8, 1, 240);

serve(async (req) => {
  const requestId = getRequestId(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'X-Request-Id': requestId } });
  }

  let supabase: any = null;
  let userId: string | null = null;
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase credentials');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header', request_id: requestId }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }

    const scopedClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    supabase = scopedClient;

    const {
      data: { user },
      error: userError,
    } = await scopedClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', request_id: requestId }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }
    userId = user.id;

    const rateLimit = await enforceRateLimit(scopedClient, user.id, 'beta-invite-claim', {
      maxRequests: CLAIM_RATE_LIMIT_PER_MIN,
      windowSeconds: 60,
    });
    if (rateLimit.guardError && isFailClosedHighCostEnabled()) {
      return jsonError({
        status: 503,
        requestId,
        error: 'Guardia de seguridad temporalmente no disponible',
        code: 'security_guard_error',
        corsHeaders,
      });
    }
    if (!rateLimit.allowed) {
      return jsonError({
        status: 429,
        requestId,
        error: 'Demasiadas solicitudes de activación beta',
        code: rateLimit.reason === 'blocked' ? 'blocked' : 'rate_limited',
        corsHeaders,
        retryAfterSeconds: rateLimit.retryAfterSeconds || 60,
      });
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code', request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }

    const { data, error } = await scopedClient.rpc('claim_beta_invite', {
      p_user_id: user.id,
      p_code: code,
    });

    if (error) {
      throw error;
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: result?.message || 'No se pudo activar el acceso beta',
          request_id: requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
        },
      );
    }

    const claimedEmail = String(user.email || '').trim().toLowerCase();
    if (claimedEmail) {
      try {
        const { data: claimRow } = await adminClient
          .from('beta_invite_claims')
          .select('id, metadata')
          .eq('code', code)
          .eq('user_id', user.id)
          .order('claimed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (claimRow?.id) {
          const metadata = claimRow.metadata && typeof claimRow.metadata === 'object'
            ? claimRow.metadata
            : {};
          await adminClient
            .from('beta_invite_claims')
            .update({
              metadata: {
                ...metadata,
                claimed_email: claimedEmail,
              },
            })
            .eq('id', claimRow.id);
        }
      } catch (traceError) {
        console.warn('claim-beta-invite: failed to persist claimed_email trace', traceError);
      }
    }

    await recordRequestResult(scopedClient, user.id, 'beta-invite-claim', true);

    return new Response(
      JSON.stringify({
        success: true,
        message: result.message || 'Acceso beta activado',
        expires_at: result.expires_at || null,
        premium_override: Boolean(result.premium_override),
        unlimited_ai: Boolean(result.unlimited_ai),
        remaining_uses: typeof result.remaining_uses === 'number' ? result.remaining_uses : null,
        request_id: requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      },
    );
  } catch (error) {
    console.error('claim-beta-invite error:', error);
    if (supabase && userId) {
      await recordRequestResult(supabase, userId, 'beta-invite-claim', false);
    }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', request_id: requestId }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      },
    );
  }
});
