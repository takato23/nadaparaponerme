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

    const now = new Date().toISOString();
    const results = [];
    for (const id of uniqueIds) {
      try {
        const { error } = await adminScoped
          .from('waitlist')
          .update({
            status: 'rejected',
            review_notes: reviewNotes || null,
            approved_at: null,
            approved_by: user.id,
            activated_at: null,
            activated_user_id: null,
            updated_at: now,
          })
          .eq('id', id);
        if (error) throw error;
        results.push({
          id,
          success: true,
          status: 'rejected',
          message: 'Entrada rechazada.',
        });
      } catch (error) {
        results.push({
          id,
          success: false,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    const rejectedCount = results.filter((result) => result.success).length;
    const failedCount = results.length - rejectedCount;
    const firstResult = results[0];

    return new Response(JSON.stringify({
      success: failedCount === 0,
      status: failedCount === 0 ? 'rejected' : (rejectedCount > 0 ? 'partial' : 'error'),
      processed: results.length,
      rejected_count: rejectedCount,
      failed_count: failedCount,
      results,
      message: results.length === 1
        ? (firstResult?.message || 'No se pudo rechazar la persona.')
        : failedCount === 0
          ? `Se rechazaron ${rejectedCount} personas.`
          : rejectedCount > 0
            ? `Se rechazaron ${rejectedCount} personas y ${failedCount} fallaron.`
            : 'No se pudo rechazar ninguna persona.',
      request_id: requestId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    });
  } catch (error) {
    console.error('reject-waitlist-entry error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', request_id: requestId }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      },
    );
  }
});
