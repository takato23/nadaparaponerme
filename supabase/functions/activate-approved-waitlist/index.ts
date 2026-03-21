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

const WAITLIST_BETA_OVERRIDE_PLAN = 'plus';
const WAITLIST_BETA_OVERRIDE_SOURCE = 'waitlist_auto_activation';
const WAITLIST_BETA_OVERRIDE_REASON = 'Waitlist auto-activation access';

async function grantWaitlistPlanOverride(
  adminScoped: any,
  userId: string,
  entry: any,
  now: string,
) {
  const metadata = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};

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
        ...metadata,
        source: entry.source,
        instagram_handle: entry.instagram_handle,
        waitlist_email: String(entry.email || '').trim().toLowerCase(),
        waitlist_entry_id: entry.id,
        approved_via: 'waitlist_auto_activation',
      },
      starts_at: now,
      expires_at: null,
      revoked_at: null,
      updated_at: now,
    });
  if (overrideError) throw overrideError;

  const { data: betaAccessEntry, error: betaLookupError } = await adminScoped
    .from('beta_access')
    .select('user_id, source_code, metadata')
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
        },
      })
      .eq('user_id', userId);
    if (revokeError) throw revokeError;
  }
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

    const email = String(user.email || '').trim().toLowerCase();
    if (!email) {
      return new Response(JSON.stringify({
        success: false,
        activated: false,
        message: 'La cuenta no tiene email verificable.',
        request_id: requestId,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }

    const { data: entry, error: entryError } = await adminScoped
      .from('waitlist')
      .select('id, email, instagram_handle, source, status, approved_by, metadata, activated_user_id')
      .eq('email', email)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (entryError) throw entryError;

    if (!entry) {
      return new Response(JSON.stringify({
        success: true,
        activated: false,
        message: 'No hay una aprobación de waitlist para este email.',
        request_id: requestId,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }

    const now = new Date().toISOString();
    await grantWaitlistPlanOverride(adminScoped, user.id, entry, now);

    if (!entry.activated_user_id || entry.activated_user_id !== user.id) {
      const { error: waitlistError } = await adminScoped
        .from('waitlist')
        .update({
          activated_at: now,
          activated_user_id: user.id,
          updated_at: now,
        })
        .eq('id', entry.id);
      if (waitlistError) throw waitlistError;
    }

    return new Response(JSON.stringify({
      success: true,
      activated: true,
      message: 'Acceso beta activado por aprobación previa.',
      request_id: requestId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    });
  } catch (error) {
    console.error('activate-approved-waitlist error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', request_id: requestId }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      },
    );
  }
});
