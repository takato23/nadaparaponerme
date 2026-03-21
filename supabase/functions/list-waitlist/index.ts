import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  assertAllowedOrigin,
  getRequestId,
  jsonError,
} from '../_shared/security.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

const ADMIN_ROLES = new Set(['admin', 'owner', 'superadmin']);

type AuthUserRow = {
  id: string;
  email: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
};

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

  const configured = rawAdminList
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const email = String(user?.email || '').toLowerCase().trim();
  return Boolean(email) && configured.includes(email);
}

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
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

  try {
    const originCheck = assertAllowedOrigin(req);
    if (!originCheck.allowed) {
      return jsonError({
        status: 403,
        requestId,
        error: 'Origen no permitido',
        code: 'forbidden_origin',
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

    if (!isAdminUser(user)) {
      return new Response(JSON.stringify({ error: 'Forbidden', request_id: requestId }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }

    const body = await req.json().catch(() => ({}));
    const status = typeof body?.status === 'string' ? body.status.trim().toLowerCase() : '';
    const search = typeof body?.search === 'string' ? body.search.trim().toLowerCase() : '';
    const limitRaw = Number(body?.limit || 50);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;

    let query = adminScoped
      .from('waitlist')
      .select('id, email, instagram_handle, source, status, review_notes, approved_at, approved_by, activated_at, activated_user_id, metadata, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`email.ilike.%${search}%,instagram_handle.ilike.%${search}%`);
    }

    const { data: entries, error } = await query;
    if (error) throw error;

    const counts = { pending: 0, approved: 0, rejected: 0 };
    const { data: allStatuses, error: countError } = await adminScoped
      .from('waitlist')
      .select('id, email, status, approved_at, activated_at, activated_user_id');
    if (countError) throw countError;

    for (const entry of allStatuses || []) {
      const key = String(entry.status || 'pending') as keyof typeof counts;
      if (key in counts) counts[key] += 1;
    }

    const allWaitlistRows = Array.isArray(allStatuses) ? allStatuses : [];
    const allEmails = Array.from(new Set(allWaitlistRows.map((entry: any) => normalizeEmail(entry.email)).filter(Boolean)));

    let authUsers: AuthUserRow[] = [];
    if (allEmails.length > 0) {
      try {
        const { data } = await adminScoped
          .schema('auth')
          .from('users')
          .select('id, email, created_at, last_sign_in_at')
          .in('email', allEmails);
        authUsers = Array.isArray(data) ? data : [];
      } catch (authError) {
        console.warn('list-waitlist: could not fetch auth.users', authError);
      }
    }

    const authUsersByEmail = Object.fromEntries(
      authUsers
        .map((row) => [normalizeEmail(row.email), row])
        .filter(([email]) => Boolean(email)),
    );
    const globalUserIds = Array.from(new Set(
      allWaitlistRows
        .map((entry: any) => {
          const email = normalizeEmail(entry.email);
          return String(entry.activated_user_id || authUsersByEmail[email]?.id || '').trim();
        })
        .filter(Boolean),
    ));

    let clothingRows: Array<Record<string, any>> = [];
    let outfitRows: Array<Record<string, any>> = [];
    let usageRows: Array<Record<string, any>> = [];
    if (globalUserIds.length > 0) {
      const [{ data: clothing }, { data: outfits }, { data: usage }] = await Promise.all([
        adminScoped.from('clothing_items').select('user_id, created_at').in('user_id', globalUserIds).is('deleted_at', null),
        adminScoped.from('outfits').select('user_id, created_at').in('user_id', globalUserIds).is('deleted_at', null),
        adminScoped.from('billing_usage_events').select('user_id, committed_at, created_at').in('user_id', globalUserIds).eq('status', 'committed'),
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

    const enrichedEntries = (entries || []).map((entry: any) => {
      const normalizedEmail = normalizeEmail(entry.email);
      const authUser = authUsersByEmail[normalizedEmail] || null;
      const userId = String(entry.activated_user_id || authUser?.id || '').trim() || null;
      const clothing = userId ? clothingByUser[userId] : null;
      const outfits = userId ? outfitsByUser[userId] : null;
      const usage = userId ? usageByUser[userId] : null;
      const lastUsageAt = [clothing?.last_at, outfits?.last_at, usage?.last_at]
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
      const hasAccount = Boolean(authUser);
      const hasSignedIn = Boolean(authUser?.last_sign_in_at);
      const hasActivity = Boolean((clothing?.count || 0) > 0 || (outfits?.count || 0) > 0 || (usage?.count || 0) > 0);
      const usageState = !hasAccount
        ? 'no_account'
        : hasActivity
          ? 'active'
          : hasSignedIn
            ? 'signed_in'
            : 'created';

      return {
        ...entry,
        account_created: hasAccount,
        account_created_at: authUser?.created_at || null,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        clothing_items_count: clothing?.count || 0,
        outfits_count: outfits?.count || 0,
        usage_events_count: usage?.count || 0,
        last_usage_at: lastUsageAt,
        usage_state: usageState,
      };
    });

    const accountUsers = globalUserIds
      .map((userId) => {
        const authUser = authUsers.find((candidate) => candidate.id === userId) || null;
        const clothing = clothingByUser[userId] || { count: 0, last_at: null };
        const outfits = outfitsByUser[userId] || { count: 0, last_at: null };
        const usage = usageByUser[userId] || { count: 0, last_at: null };
        const lastUsageAt = [clothing.last_at, outfits.last_at, usage.last_at]
          .filter((value): value is string => Boolean(value))
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
        return {
          user_id: userId,
          account_created: Boolean(authUser),
          last_sign_in_at: authUser?.last_sign_in_at || null,
          clothing_items_count: clothing.count,
          outfits_count: outfits.count,
          usage_events_count: usage.count,
          last_usage_at: lastUsageAt,
        };
      });

    const accountsCreated = accountUsers.filter((userRow) => userRow.account_created).length;
    const signedIn = accountUsers.filter((userRow) => Boolean(userRow.last_sign_in_at)).length;
    const activeUsers = accountUsers.filter((userRow) => (
      userRow.clothing_items_count > 0 ||
      userRow.outfits_count > 0 ||
      userRow.usage_events_count > 0
    )).length;
    const active7d = accountUsers.filter((userRow) => (
      isRecent(userRow.last_usage_at, 7) || isRecent(userRow.last_sign_in_at, 7)
    )).length;
    const active30d = accountUsers.filter((userRow) => (
      isRecent(userRow.last_usage_at, 30) || isRecent(userRow.last_sign_in_at, 30)
    )).length;
    const closetUploaders = accountUsers.filter((userRow) => userRow.clothing_items_count > 0).length;
    const lookSavers = accountUsers.filter((userRow) => userRow.outfits_count > 0).length;
    const usageEventUsers = accountUsers.filter((userRow) => userRow.usage_events_count > 0).length;
    const activated = allWaitlistRows.filter((entry: any) => Boolean(entry.activated_at || entry.activated_user_id)).length;
    const total = allWaitlistRows.length;
    const approved = counts.approved;

    return new Response(JSON.stringify({
      entries: enrichedEntries,
      counts,
      summary: {
        total,
        pending: counts.pending,
        approved,
        rejected: counts.rejected,
        activated,
        accounts_created: accountsCreated,
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
        approval_rate: total > 0 ? Number((approved / total).toFixed(4)) : 0,
        activation_rate: approved > 0 ? Number((activated / approved).toFixed(4)) : 0,
        account_creation_rate: approved > 0 ? Number((accountsCreated / approved).toFixed(4)) : 0,
        sign_in_rate: accountsCreated > 0 ? Number((signedIn / accountsCreated).toFixed(4)) : 0,
        active_rate: accountsCreated > 0 ? Number((activeUsers / accountsCreated).toFixed(4)) : 0,
      },
      request_id: requestId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    });
  } catch (error) {
    console.error('list-waitlist error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', request_id: requestId }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      },
    );
  }
});
