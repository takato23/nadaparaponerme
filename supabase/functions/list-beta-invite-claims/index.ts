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

type UsageAggregate = {
  count: number;
  last_at: string | null;
};

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

function aggregateUsage(rows: Array<Record<string, any>>, dateField: string): Record<string, UsageAggregate> {
  return (rows || []).reduce<Record<string, UsageAggregate>>((acc, row) => {
    const userId = String(row.user_id || '');
    if (!userId) return acc;
    const timestamp = typeof row[dateField] === 'string' ? row[dateField] : null;
    const current = acc[userId] || { count: 0, last_at: null };
    current.count += 1;
    if (timestamp && (!current.last_at || new Date(timestamp).getTime() > new Date(current.last_at).getTime())) {
      current.last_at = timestamp;
    }
    acc[userId] = current;
    return acc;
  }, {});
}

function isRecent(timestamp: string | null | undefined, days: number): boolean {
  if (!timestamp) return false;
  const age = Date.now() - new Date(timestamp).getTime();
  return age >= 0 && age <= days * 24 * 60 * 60 * 1000;
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
      return new Response(JSON.stringify({
        invites: [],
        claims: [],
        summary: {
          total_invites: 0,
          total_slots: 0,
          used_slots: 0,
          remaining_slots: 0,
          claims: 0,
          claimers: 0,
          accounts_created: 0,
          signed_in: 0,
          active_users: 0,
          active_last_7d: 0,
          active_last_30d: 0,
          closet_uploaders: 0,
          look_savers: 0,
          usage_event_users: 0,
          total_clothing_items: 0,
          total_outfits: 0,
          total_usage_events: 0,
          claim_rate: 0,
          active_rate: 0,
        },
      }), {
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
    let authUsersById: Record<string, { created_at: string | null; last_sign_in_at: string | null }> = {};
    if (userIds.length > 0) {
      try {
        const { data: authUsers } = await adminScoped
          .schema('auth')
          .from('users')
          .select('id, email, created_at, last_sign_in_at')
          .in('id', userIds);
        emailsById = Object.fromEntries((authUsers || []).map((userRow: any) => [String(userRow.id), String(userRow.email || '')]));
        authUsersById = Object.fromEntries((authUsers || []).map((userRow: any) => [
          String(userRow.id),
          {
            created_at: userRow.created_at || null,
            last_sign_in_at: userRow.last_sign_in_at || null,
          },
        ]));
      } catch (error) {
        console.warn('list-beta-invite-claims: could not fetch auth.users emails', error);
      }
    }

    let clothingRows: Array<Record<string, any>> = [];
    let outfitRows: Array<Record<string, any>> = [];
    let usageRows: Array<Record<string, any>> = [];
    if (userIds.length > 0) {
      const [{ data: clothing }, { data: outfits }, { data: usage }] = await Promise.all([
        adminScoped.from('clothing_items').select('user_id, created_at').in('user_id', userIds).is('deleted_at', null),
        adminScoped.from('outfits').select('user_id, created_at').in('user_id', userIds).is('deleted_at', null),
        adminScoped.from('billing_usage_events').select('user_id, committed_at, created_at').in('user_id', userIds).eq('status', 'committed'),
      ]);
      clothingRows = Array.isArray(clothing) ? clothing : [];
      outfitRows = Array.isArray(outfits) ? outfits : [];
      usageRows = Array.isArray(usage) ? usage : [];
    }

    const clothingByUser = aggregateUsage(clothingRows, 'created_at');
    const outfitsByUser = aggregateUsage(outfitRows, 'created_at');
    const usageByUser = aggregateUsage(
      usageRows.map((row) => ({ ...row, effective_at: row.committed_at || row.created_at || null })),
      'effective_at',
    );

    const enrichedClaims = (claims || []).map((claim: any) => {
      const userId = String(claim.user_id);
      const profile = profilesById[userId] || {};
      const metadata = claim.metadata && typeof claim.metadata === 'object' ? claim.metadata : {};
      const clothing = clothingByUser[userId] || { count: 0, last_at: null };
      const outfits = outfitsByUser[userId] || { count: 0, last_at: null };
      const usage = usageByUser[userId] || { count: 0, last_at: null };
      const authUser = authUsersById[userId] || { created_at: null, last_sign_in_at: null };
      const lastUsageAt = [clothing.last_at, outfits.last_at, usage.last_at]
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
      const lastSignInAt = authUser.last_sign_in_at;
      return {
        ...claim,
        email: emailsById[userId] || metadata.claimed_email || null,
        username: profile.username || null,
        display_name: profile.display_name || null,
        account_created_at: authUser.created_at,
        last_sign_in_at: lastSignInAt,
        clothing_items_count: clothing.count,
        outfits_count: outfits.count,
        usage_events_count: usage.count,
        last_usage_at: lastUsageAt,
        usage_state: (clothing.count > 0 || outfits.count > 0 || usage.count > 0)
          ? 'active'
          : 'created',
      };
    });

    const totalSlots = (invites || []).reduce((sum: number, invite: any) => sum + Number(invite.max_uses || 0), 0);
    const usedSlots = (invites || []).reduce((sum: number, invite: any) => sum + Number(invite.uses_count || 0), 0);
    const claimers = userIds.length;
    const signedIn = userIds.filter((userId) => Boolean(authUsersById[userId]?.last_sign_in_at)).length;
    const activeUsers = userIds.filter((userId) => (
      (clothingByUser[userId]?.count || 0) > 0 ||
      (outfitsByUser[userId]?.count || 0) > 0 ||
      (usageByUser[userId]?.count || 0) > 0
    )).length;
    const active7d = userIds.filter((userId) => (
      isRecent(clothingByUser[userId]?.last_at, 7) ||
      isRecent(outfitsByUser[userId]?.last_at, 7) ||
      isRecent(usageByUser[userId]?.last_at, 7)
    )).length;
    const active30d = userIds.filter((userId) => (
      isRecent(clothingByUser[userId]?.last_at, 30) ||
      isRecent(outfitsByUser[userId]?.last_at, 30) ||
      isRecent(usageByUser[userId]?.last_at, 30)
    )).length;
    const closetUploaders = userIds.filter((userId) => (clothingByUser[userId]?.count || 0) > 0).length;
    const lookSavers = userIds.filter((userId) => (outfitsByUser[userId]?.count || 0) > 0).length;
    const usageEventUsers = userIds.filter((userId) => (usageByUser[userId]?.count || 0) > 0).length;

    await recordRequestResult(userScoped, user.id, 'beta-invite-list', true);

    return new Response(
      JSON.stringify({
        invites: invites || [],
        claims: enrichedClaims,
        summary: {
          total_invites: (invites || []).length,
          total_slots: totalSlots,
          used_slots: usedSlots,
          remaining_slots: Math.max(0, totalSlots - usedSlots),
          claims: (claims || []).length,
          claimers,
          accounts_created: claimers,
          signed_in: signedIn,
          active_users: activeUsers,
          active_last_7d: active7d,
          active_last_30d: active30d,
          closet_uploaders: closetUploaders,
          look_savers: lookSavers,
          usage_event_users: usageEventUsers,
          total_clothing_items: clothingRows.length,
          total_outfits: outfitRows.length,
          total_usage_events: usageRows.length,
          claim_rate: totalSlots > 0 ? Number((usedSlots / totalSlots).toFixed(4)) : 0,
          active_rate: claimers > 0 ? Number((activeUsers / claimers).toFixed(4)) : 0,
        },
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
