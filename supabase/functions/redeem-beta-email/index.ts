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

const INVITE_OVERRIDE_PLAN = 'plus';

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeCode(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function applyInvitePlanOverride(
  adminScoped: any,
  userId: string,
  invite: any,
  email: string,
  code: string,
  now: string,
) {
  const { error: revokeOverrideError } = await adminScoped
    .from('billing_user_overrides')
    .update({
      revoked_at: now,
      updated_at: now,
    })
    .eq('user_id', userId)
    .in('source', ['invite_claim', 'manual_link_email'])
    .is('revoked_at', null);
  if (revokeOverrideError) throw revokeOverrideError;

  const { error: insertOverrideError } = await adminScoped
    .from('billing_user_overrides')
    .insert({
      user_id: userId,
      override_plan_code: INVITE_OVERRIDE_PLAN,
      feature_overrides: {},
      bucket_overrides: {},
      unlimited_buckets: [],
      source: 'manual_link_email',
      reason: 'Invite redemption access',
      metadata: {
        claimed_email: email,
        claimed_code: code,
        invite_code: code,
        approved_via: 'manual_link_email',
      },
      starts_at: now,
      expires_at: invite.expires_at || null,
      revoked_at: null,
      updated_at: now,
    });
  if (insertOverrideError) throw insertOverrideError;

  const { data: activeBetaRow, error: betaLookupError } = await adminScoped
    .from('beta_access')
    .select('user_id, metadata')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .maybeSingle();
  if (betaLookupError) throw betaLookupError;

  if (activeBetaRow?.user_id) {
    const betaMetadata = activeBetaRow.metadata && typeof activeBetaRow.metadata === 'object'
      ? activeBetaRow.metadata
      : {};
    const { error: revokeBetaError } = await adminScoped
      .from('beta_access')
      .update({
        revoked_at: now,
        updated_at: now,
        metadata: {
          ...betaMetadata,
          migrated_to_plan_override: INVITE_OVERRIDE_PLAN,
          migrated_at: now,
        },
      })
      .eq('user_id', userId)
      .is('revoked_at', null);
    if (revokeBetaError) throw revokeBetaError;
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

    const adminScoped = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const code = normalizeCode(body?.code);

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ success: false, message: 'Ingresá un mail válido.', request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }

    if (!code) {
      return new Response(JSON.stringify({ success: false, message: 'Falta el código beta.', request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }

    const { data: invite, error: inviteError } = await adminScoped
      .from('beta_invite_codes')
      .select('*')
      .eq('code', code)
      .maybeSingle();
    if (inviteError) throw inviteError;
    if (!invite) {
      return new Response(JSON.stringify({ success: false, message: 'Código beta inválido.', request_id: requestId }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }
    if (invite.revoked_at) {
      return new Response(JSON.stringify({ success: false, message: 'Este link ya no está activo.', request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }
    if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
      return new Response(JSON.stringify({ success: false, message: 'Este link beta venció.', request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }
    if (Number(invite.uses_count || 0) >= Number(invite.max_uses || 0)) {
      return new Response(JSON.stringify({ success: false, message: 'Este link ya usó todos sus cupos.', request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }

    const { data: authUsers } = await adminScoped
      .schema('auth')
      .from('users')
      .select('id, email')
      .eq('email', email)
      .limit(1);
    let userId = authUsers?.[0]?.id || null;
    const existingUser = Boolean(userId);

    if (!userId) {
      const inviteResult = await adminScoped.auth.admin.inviteUserByEmail(email, {
        data: {
          beta_manual_link: code,
        },
        redirectTo: resolveAppUrl(req),
      });
      if (inviteResult.error) throw inviteResult.error;
      userId = inviteResult.data.user?.id || null;
    }

    if (!userId) {
      throw new Error('No se pudo preparar la cuenta para este mail');
    }

    const { data: existingClaim } = await adminScoped
      .from('beta_invite_claims')
      .select('id')
      .eq('code', code)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();

    await adminScoped
      .from('beta_access')
      .upsert({
        user_id: userId,
        source_code: code,
        premium_override: Boolean(invite.grants_premium),
        unlimited_ai: Boolean(invite.grants_unlimited_ai),
        granted_by: invite.created_by || null,
        granted_at: now,
        expires_at: invite.expires_at || null,
        revoked_at: null,
        metadata: {
          claimed_email: email,
          claimed_code: code,
          approved_via: 'manual_link_email',
        },
        updated_at: now,
      });

    await applyInvitePlanOverride(adminScoped, userId, invite, email, code, now);

    if (!existingClaim) {
      const { error: claimError } = await adminScoped
        .from('beta_invite_claims')
        .insert({
          code,
          user_id: userId,
          claimed_at: now,
          source: 'manual_link_email',
          metadata: {
            claimed_email: email,
          },
        });
      if (claimError) throw claimError;

      const { error: consumeError } = await adminScoped
        .from('beta_invite_codes')
        .update({
          uses_count: Number(invite.uses_count || 0) + 1,
          updated_at: now,
        })
        .eq('code', code);
      if (consumeError) throw consumeError;
    }

    return new Response(JSON.stringify({
      success: true,
      existing_user: existingUser,
      message: existingUser
        ? 'Listo. Ese mail ya tiene acceso beta. Ahora entrá con esa cuenta.'
        : 'Listo. Te mandamos un mail para crear la cuenta con acceso beta.',
      request_id: requestId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    });
  } catch (error) {
    console.error('redeem-beta-email error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', request_id: requestId }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      },
    );
  }
});
