import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveAppUrl } from '../_shared/appUrl.ts';
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

const ADMIN_ROLES = new Set(['admin', 'owner', 'superadmin']);
const INVITE_RATE_LIMIT_PER_MIN = parsePositiveIntEnv('RATE_LIMIT_CREATE_BETA_PER_MIN', 3, 1, 120);

function isAdminUser(user: any): boolean {
  const appRole = typeof user?.app_metadata?.role === 'string' ? user.app_metadata.role.toLowerCase() : '';
  const userRole = typeof user?.user_metadata?.role === 'string' ? user.user_metadata.role.toLowerCase() : '';
  if (ADMIN_ROLES.has(appRole) || ADMIN_ROLES.has(userRole)) return true;

  const rawAdminList = [
    String(Deno.env.get('BETA_INVITE_ADMIN_EMAILS') || ''),
    String(Deno.env.get('ADMIN_EMAILS') || ''),
    String(Deno.env.get('VITE_ADMIN_EMAILS') || ''),
  ]
    .filter(Boolean)
    .join(',');

  const configured = [
    ...rawAdminList
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  ];
  const email = String(user?.email || '').toLowerCase().trim();
  return Boolean(email) && configured.includes(email);
}

function sanitizeMaxUses(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(200, Math.floor(parsed)));
}

function sanitizeValidDays(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(1, Math.min(365, Math.floor(parsed)));
}

function buildInviteCode(prefix = 'BETA'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 8; i += 1) {
    const idx = Math.floor(Math.random() * chars.length);
    random += chars[idx];
  }
  return `${prefix}-${random}`;
}

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

    const userScoped = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminScoped = createClient(supabaseUrl, serviceRoleKey);
    supabase = userScoped;

    const {
      data: { user },
      error: userError,
    } = await userScoped.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', request_id: requestId }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }
    userId = user.id;

    if (!isAdminUser(user)) {
      return new Response(JSON.stringify({ error: 'Forbidden', request_id: requestId }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }

    const rateLimit = await enforceRateLimit(userScoped, user.id, 'beta-invite-create', {
      maxRequests: INVITE_RATE_LIMIT_PER_MIN,
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
        error: 'Demasiadas solicitudes para generar links beta',
        code: rateLimit.reason === 'blocked' ? 'blocked' : 'rate_limited',
        corsHeaders,
        retryAfterSeconds: rateLimit.retryAfterSeconds || 60,
      });
    }

    const body = await req.json().catch(() => ({}));
    const maxUses = sanitizeMaxUses(body?.maxUses);
    const validDays = sanitizeValidDays(body?.validDays);
    const grantsPremium = body?.grantsPremium !== false;
    const grantsUnlimitedAI = body?.grantsUnlimitedAI !== false;
    const note = typeof body?.note === 'string' ? body.note.slice(0, 240) : null;
    const prefix = typeof body?.prefix === 'string' && body.prefix.trim().length >= 2
      ? body.prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
      : 'BETA';

    let code: string | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate = buildInviteCode(prefix);
      const expiresAt = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString();

      const { error: insertError } = await adminScoped.from('beta_invite_codes').insert({
        code: candidate,
        created_by: user.id,
        max_uses: maxUses,
        uses_count: 0,
        grants_premium: grantsPremium,
        grants_unlimited_ai: grantsUnlimitedAI,
        expires_at: expiresAt,
        metadata: note ? { note } : {},
      });

      if (!insertError) {
        code = candidate;
        break;
      }

      if (insertError.code !== '23505') {
        throw insertError;
      }
    }

    if (!code) {
      throw new Error('No se pudo generar un código único');
    }

    const appUrl = resolveAppUrl(req);
    const shareLink = `${appUrl}/?beta=${encodeURIComponent(code)}`;

    await recordRequestResult(userScoped, user.id, 'beta-invite-create', true);

    return new Response(
      JSON.stringify({
        code,
        shareLink,
        maxUses,
        validDays,
        grantsPremium,
        grantsUnlimitedAI,
        request_id: requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      },
    );
  } catch (error) {
    console.error('create-beta-invite error:', error);
    if (supabase && userId) {
      await recordRequestResult(supabase, userId, 'beta-invite-create', false);
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
