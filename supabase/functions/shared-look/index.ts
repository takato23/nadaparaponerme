import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SHARE_LOOK_TTL_SECONDS = 15 * 60; // 15 minutes
const VALID_SHARE_TOKEN = /^[a-f0-9]{48}$/;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
  'Access-Control-Max-Age': '86400',
};

const toResponse = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function extractStoragePath(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.includes('/storage/v1/object/public/generated-looks/')) {
    return imageUrl.split('/storage/v1/object/public/generated-looks/')[1];
  }
  if (imageUrl.includes('/storage/v1/object/sign/generated-looks/')) {
    return imageUrl.split('/storage/v1/object/sign/generated-looks/')[1].split('?')[0];
  }

  const fallbackMatch = imageUrl.match(/\/generated-looks\/(.+?)(\?.*)?$/);
  return fallbackMatch?.[1] ? fallbackMatch[1].split('?')[0] : null;
}

function normalizeShareToken(token: string): string {
  return token.trim().toLowerCase();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return toResponse(405, { error: 'Método no permitido.' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return toResponse(500, { error: 'Falta configuración del servicio.' });
    }

    const body = await req.json();
    const token = typeof body?.token === 'string' ? normalizeShareToken(body.token) : '';

    if (!VALID_SHARE_TOKEN.test(token)) {
      return toResponse(400, { error: 'Token inválido.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: look, error } = await supabaseAdmin
      .from('generated_looks')
      .select('id,storage_path,image_url,selfie_url,title,notes,created_at,generation_preset,generation_model,keep_pose,face_refs_used')
      .eq('share_token', token)
      .eq('is_public', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching shared look:', error);
      return toResponse(500, { error: 'No se pudo cargar el look compartido.' });
    }

    if (!look) {
      return toResponse(410, { error: 'El link ya no está disponible.' });
    }

    const storagePath = look.storage_path
      ? look.storage_path.trim()
      : extractStoragePath(look.image_url);
    if (!storagePath) {
      return toResponse(410, { error: 'El recurso ya no está disponible.' });
    }

    const { data: signedImage, error: signedError } = await supabaseAdmin.storage
      .from('generated-looks')
      .createSignedUrl(storagePath, SHARE_LOOK_TTL_SECONDS);

    if (signedError || !signedImage?.signedUrl) {
      console.error('Error creating signed URL for shared look:', signedError);
      return toResponse(410, { error: 'No se pudo generar un acceso temporal para este look.' });
    }

    return toResponse(200, {
      id: look.id,
      image_url: signedImage.signedUrl,
      selfie_url: look.selfie_url || undefined,
      title: look.title || null,
      notes: look.notes || null,
      created_at: look.created_at,
      generation_preset: look.generation_preset,
      generation_model: look.generation_model,
      keep_pose: look.keep_pose,
      face_refs_used: look.face_refs_used,
    });
  } catch (error) {
    console.error('Unexpected error on shared look endpoint:', error);
    return toResponse(500, { error: 'Error interno en el endpoint de compartido.' });
  }
});
