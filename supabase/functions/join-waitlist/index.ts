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

function getAdminEmails(): string[] {
  return [
    String(Deno.env.get('BETA_INVITE_ADMIN_EMAILS') || ''),
    String(Deno.env.get('ADMIN_EMAILS') || ''),
    String(Deno.env.get('VITE_ADMIN_EMAILS') || ''),
  ]
    .join(',')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeInstagramHandle(value: unknown): string | null {
  const normalized = String(value || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
    .slice(0, 60);
  return normalized || null;
}

function normalizeSource(value: unknown): string {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .slice(0, 80);
  return normalized || 'instagram';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    const instagramHandle = normalizeInstagramHandle(body?.instagram_handle ?? body?.instagramHandle);
    const source = normalizeSource(body?.source);
    const metadata = {
      utm_source: String(body?.utm_source || '').trim() || null,
      utm_medium: String(body?.utm_medium || '').trim() || null,
      utm_campaign: String(body?.utm_campaign || '').trim() || null,
      entry_path: String(body?.entry_path || '').trim() || null,
    };

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({
        success: false,
        status: 'invalid_email',
        message: 'Por favor ingresá un email válido.',
        request_id: requestId,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      });
    }

    const { data: existing } = await adminScoped
      .from('waitlist')
      .select('id, status, activated_user_id')
      .eq('email', email)
      .maybeSingle();

    const now = new Date().toISOString();
    const payload = {
      email,
      instagram_handle: instagramHandle,
      source,
      metadata,
      updated_at: now,
    };

    const { data, error } = await adminScoped
      .from('waitlist')
      .upsert(payload, { onConflict: 'email' })
      .select('id, email, status, approved_at, activated_at, activated_user_id')
      .single();

    if (error) throw error;

    if (!existing) {
      try {
        const adminEmails = Array.from(new Set(getAdminEmails()));
        if (adminEmails.length > 0) {
          const { data: adminUsers } = await adminScoped
            .schema('auth')
            .from('users')
            .select('id, email')
            .in('email', adminEmails);

          const adminIds = (adminUsers || []).map((row: any) => String(row.id)).filter(Boolean);
          if (adminIds.length > 0) {
            const notificationsPayload = adminIds.map((adminId) => ({
              user_id: adminId,
              actor_id: adminId,
              event_type: 'report_status',
              entity_type: 'profile',
              entity_id: null,
              metadata: {
                title: 'Nueva persona en waitlist beta',
                subtitle: `${email}${instagramHandle ? ` • @${instagramHandle}` : ''}`,
                source,
                waitlist_email: email,
                instagram_handle: instagramHandle,
                notification_kind: 'waitlist_signup',
              },
            }));

            const { error: notificationError } = await adminScoped
              .from('social_notifications')
              .insert(notificationsPayload);
            if (notificationError) {
              console.warn('join-waitlist: failed to create admin notifications', notificationError);
            }
          }
        }
      } catch (notificationError) {
        console.warn('join-waitlist: failed to notify admins', notificationError);
      }
    }

    const status = String(data?.status || existing?.status || 'pending');
    const isActivated = Boolean(data?.activated_user_id || existing?.activated_user_id);
    const message = status === 'approved'
      ? isActivated
        ? 'Tu acceso ya está habilitado. Entrá con ese email.'
        : 'Ya aprobamos tu acceso. Entrá o creá tu cuenta con ese email.'
      : existing
        ? 'Ya estabas en la lista. Cuando te aprobemos, vas a poder entrar con ese email.'
        : 'Te sumamos a la beta. Cuando aprobemos tu acceso, vas a poder entrar con ese email.';

    return new Response(JSON.stringify({
      success: true,
      status,
      message,
      already_exists: Boolean(existing),
      approved: status === 'approved',
      activated: isActivated,
      request_id: requestId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    });
  } catch (error) {
    console.error('join-waitlist error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', request_id: requestId }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      },
    );
  }
});
