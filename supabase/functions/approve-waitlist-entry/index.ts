import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveAppUrl } from '../_shared/appUrl.ts';
import {
  assertAllowedOrigin,
  getRequestId,
  jsonError,
} from '../_shared/security.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

const WAITLIST_BETA_OVERRIDE_PLAN = 'plus';
const WAITLIST_BETA_OVERRIDE_SOURCE = 'waitlist_admin';
const WAITLIST_BETA_OVERRIDE_REASON = 'Waitlist approval access';

const ADMIN_ROLES = new Set(['admin', 'owner', 'superadmin']);

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

async function sendApprovedAccessNotice(
  adminScoped: any,
  email: string,
  redirectTo: string,
): Promise<{ sent: boolean; mode: 'invite' | 'magiclink'; error?: string }> {
  const { error } = await adminScoped.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: redirectTo,
      data: {
        beta_waitlist_approved: true,
      },
    },
  });

  if (error) {
    return { sent: false, mode: 'magiclink', error: error.message };
  }

  return { sent: true, mode: 'magiclink' };
}

async function grantWaitlistPlanOverride(
  adminScoped: any,
  userId: string,
  entry: any,
  actingUser: any,
  now: string,
) {
  const waitlistMetadata = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};

  const { error: revokeOverrideError } = await adminScoped
    .from('billing_user_overrides')
    .update({
      revoked_at: now,
      updated_at: now,
    })
    .eq('user_id', userId)
    .in('source', ['waitlist_admin', 'waitlist_auto_activation', 'waitlist_migration'])
    .is('revoked_at', null);
  if (revokeOverrideError) throw revokeOverrideError;

  const { error: overrideError } = await adminScoped
    .from('billing_user_overrides')
    .insert({
      user_id: userId,
      override_plan_code: WAITLIST_BETA_OVERRIDE_PLAN,
      feature_overrides: {},
      bucket_overrides: {},
      unlimited_buckets: [],
      source: WAITLIST_BETA_OVERRIDE_SOURCE,
      reason: WAITLIST_BETA_OVERRIDE_REASON,
      metadata: {
        ...waitlistMetadata,
        source: entry.source,
        instagram_handle: entry.instagram_handle,
        waitlist_email: String(entry.email || '').trim().toLowerCase(),
        waitlist_entry_id: entry.id,
        approved_via: 'waitlist_admin',
      },
      starts_at: now,
      expires_at: null,
      revoked_at: null,
      updated_at: now,
    });
  if (overrideError) throw overrideError;

  const { data: betaAccessEntry, error: betaLookupError } = await adminScoped
    .from('beta_access')
    .select('user_id, source_code, metadata, revoked_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (betaLookupError) throw betaLookupError;

  const betaMetadata = betaAccessEntry?.metadata && typeof betaAccessEntry.metadata === 'object'
    ? betaAccessEntry.metadata
    : {};
  const approvedVia = typeof betaMetadata.approved_via === 'string' ? betaMetadata.approved_via : '';
  const shouldRevokeLegacyWaitlistGrant = Boolean(betaAccessEntry)
    && !betaAccessEntry?.source_code
    && ['waitlist_admin', 'waitlist_auto_activation', 'codex_manual_repair'].includes(approvedVia);

  if (shouldRevokeLegacyWaitlistGrant) {
    const { error: revokeError } = await adminScoped
      .from('beta_access')
      .update({
        revoked_at: now,
        updated_at: now,
        metadata: {
          ...betaMetadata,
          migrated_to_plan_override: WAITLIST_BETA_OVERRIDE_PLAN,
          migrated_at: now,
          migrated_by: actingUser?.id || null,
        },
      })
      .eq('user_id', userId);
    if (revokeError) throw revokeError;
  }
}

async function approveSingleEntry(
  adminScoped: any,
  entryId: string,
  reviewNotes: string,
  actingUser: any,
  redirectTo: string,
) {
  const { data: entry, error: entryError } = await adminScoped
    .from('waitlist')
    .select('id, email, instagram_handle, source, status, metadata')
    .eq('id', entryId)
    .single();
  if (entryError || !entry) throw entryError || new Error('Waitlist entry not found');

  const now = new Date().toISOString();
  const normalizedEmail = String(entry.email || '').trim().toLowerCase();

  const { data: authUsers } = await adminScoped
    .schema('auth')
    .from('users')
    .select('id, email')
    .eq('email', normalizedEmail)
    .limit(1);
  let matchedUserId = authUsers?.[0]?.id || null;
  const existingUser = Boolean(matchedUserId);

  let notificationEmailSent = false;
  let notificationMode: 'invite' | 'magiclink' | null = null;
  let notificationWarning: string | null = null;

  if (!matchedUserId) {
    const inviteResult = await adminScoped.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: {
        beta_waitlist: true,
        source: entry.source,
        instagram_handle: entry.instagram_handle,
      },
      redirectTo,
    });
    if (inviteResult.error) throw inviteResult.error;
    matchedUserId = inviteResult.data.user?.id || null;
    notificationEmailSent = true;
    notificationMode = 'invite';
  }

  if (matchedUserId) {
    await grantWaitlistPlanOverride(adminScoped, matchedUserId, entry, actingUser, now);
  }

  const { error: updateError } = await adminScoped
    .from('waitlist')
    .update({
      status: 'approved',
      review_notes: reviewNotes || null,
      approved_at: now,
      approved_by: actingUser.id,
      activated_at: matchedUserId ? now : null,
      activated_user_id: matchedUserId,
      updated_at: now,
    })
    .eq('id', entryId);
  if (updateError) throw updateError;

  if (existingUser) {
    const noticeResult = await sendApprovedAccessNotice(adminScoped, normalizedEmail, redirectTo);
    notificationEmailSent = noticeResult.sent;
    notificationMode = noticeResult.mode;
    notificationWarning = noticeResult.error || null;
  }

  return {
    id: entry.id,
    email: normalizedEmail,
    success: true,
    status: 'approved',
    matched_user_id: matchedUserId,
    access_granted: Boolean(matchedUserId),
    notification_email_sent: notificationEmailSent,
    notification_mode: notificationMode,
    notification_warning: notificationWarning,
    message: matchedUserId
      ? notificationEmailSent
        ? existingUser
          ? 'Aprobada. Ya le mandamos un mail para que vuelva a entrar.'
          : 'Aprobada y cuenta preparada. Ya salió el mail de invitación.'
        : existingUser
          ? 'Aprobada y acceso habilitado, pero el mail automático no salió.'
          : 'Aprobada y cuenta preparada.'
      : 'Aprobada, pero no se pudo preparar la cuenta.',
  };
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
    const entryId = String(body?.id || '').trim();
    const entryIds = Array.isArray(body?.ids)
      ? body.ids.map((value: unknown) => String(value || '').trim()).filter(Boolean)
      : [];
    const reviewNotes = String(body?.review_notes ?? body?.reviewNotes ?? '').trim().slice(0, 400);
    const uniqueIds = Array.from(new Set([entryId, ...entryIds].filter(Boolean)));

    if (uniqueIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing id', request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }
    const redirectTo = resolveAppUrl(req);
    const results = [];
    for (const id of uniqueIds) {
      try {
        const result = await approveSingleEntry(adminScoped, id, reviewNotes, user, redirectTo);
        results.push(result);
      } catch (error) {
        results.push({
          id,
          success: false,
          status: 'error',
          matched_user_id: null,
          access_granted: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    const approvedCount = results.filter((result) => result.success).length;
    const failedCount = results.length - approvedCount;
    const firstResult = results[0];

    return new Response(JSON.stringify({
      success: failedCount === 0,
      status: failedCount === 0 ? 'approved' : (approvedCount > 0 ? 'partial' : 'error'),
      processed: results.length,
      approved_count: approvedCount,
      failed_count: failedCount,
      results,
      matched_user_id: firstResult?.matched_user_id || null,
      access_granted: Boolean(firstResult?.access_granted),
      notification_email_sent: Boolean((firstResult as any)?.notification_email_sent),
      notification_mode: (firstResult as any)?.notification_mode || null,
      notification_warning: (firstResult as any)?.notification_warning || null,
      message: results.length === 1
        ? (firstResult?.message || 'No se pudo aprobar la persona.')
        : failedCount === 0
          ? `Se aprobaron ${approvedCount} personas.`
          : approvedCount > 0
            ? `Se aprobaron ${approvedCount} personas y ${failedCount} fallaron.`
            : 'No se pudo aprobar ninguna persona.',
      request_id: requestId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    });
  } catch (error) {
    console.error('approve-waitlist-entry error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', request_id: requestId }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      },
    );
  }
});
