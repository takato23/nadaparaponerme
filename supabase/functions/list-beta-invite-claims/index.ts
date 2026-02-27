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

const ADMIN_ROLES = new Set(['admin', 'owner', 'superadmin']);
const LIST_RATE_LIMIT_PER_MIN = parsePositiveIntEnv('RATE_LIMIT_LIST_BETA_PER_MIN', 20, 1, 240);

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

    const rateLimit = await enforceRateLimit(userScoped, user.id, 'beta-invite-list', {
      maxRequests: LIST_RATE_LIMIT_PER_MIN,
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
        error: 'Demasiadas consultas de trazabilidad beta',
        code: rateLimit.reason === 'blocked' ? 'blocked' : 'rate_limited',
        corsHeaders,
        retryAfterSeconds: rateLimit.retryAfterSeconds || 60,
      });
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : null;
    const limitRaw = Number(body?.limit || 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 20;

    let invitesQuery = adminScoped
      .from('beta_invite_codes')
      .select('code, max_uses, uses_count, expires_at, revoked_at, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (code) {
      invitesQuery = invitesQuery.eq('code', code);
    }

    const { data: invites, error: invitesError } = await invitesQuery;
    if (invitesError) throw invitesError;

    const codes = (invites || []).map((invite: any) => String(invite.code));
    if (codes.length === 0) {
      await recordRequestResult(userScoped, user.id, 'beta-invite-list', true);
      return new Response(JSON.stringify({ invites: [], claims: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }

    const { data: claims, error: claimsError } = await adminScoped
      .from('beta_invite_claims')
      .select('code, user_id, claimed_at, source, metadata')
      .in('code', codes)
      .order('claimed_at', { ascending: false });
    if (claimsError) throw claimsError;

    const userIds = Array.from(new Set((claims || []).map((row: any) => String(row.user_id)).filter(Boolean)));

    let profilesById: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await adminScoped
        .from('profiles')
        .select('id, username, display_name')
        .in('id', userIds);
      profilesById = Object.fromEntries((profiles || []).map((profile: any) => [String(profile.id), profile]));
    }

    let emailsById: Record<string, string> = {};
    if (userIds.length > 0) {
      try {
        const { data: authUsers } = await adminScoped
          .schema('auth')
          .from('users')
          .select('id, email')
          .in('id', userIds);
        emailsById = Object.fromEntries((authUsers || []).map((userRow: any) => [String(userRow.id), String(userRow.email || '')]));
      } catch (error) {
        console.warn('list-beta-invite-claims: could not fetch auth.users emails', error);
      }
    }

    const enrichedClaims = (claims || []).map((claim: any) => {
      const userId = String(claim.user_id);
      const profile = profilesById[userId] || {};
      const metadata = claim.metadata && typeof claim.metadata === 'object' ? claim.metadata : {};
      return {
        ...claim,
        email: emailsById[userId] || metadata.claimed_email || null,
        username: profile.username || null,
        display_name: profile.display_name || null,
      };
    });

    await recordRequestResult(userScoped, user.id, 'beta-invite-list', true);

    return new Response(
      JSON.stringify({
        invites: invites || [],
        claims: enrichedClaims,
        request_id: requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      },
    );
  } catch (error) {
    console.error('list-beta-invite-claims error:', error);
    if (supabase && userId) {
      await recordRequestResult(supabase, userId, 'beta-invite-list', false);
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
