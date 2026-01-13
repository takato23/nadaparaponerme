// Supabase Edge Function: Delete Account and User Data
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deleteBucketFiles = async (bucket: string, prefix: string) => {
      const files: string[] = [];
      const listRecursive = async (path: string) => {
        let offset = 0;
        while (true) {
          const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .list(path, { limit: 100, offset });
          if (error || !data || data.length === 0) break;

          for (const item of data) {
            const itemPath = `${path}/${item.name}`;
            if (item.id) {
              files.push(itemPath);
            } else {
              await listRecursive(itemPath);
            }
          }

          if (data.length < 100) break;
          offset += data.length;
        }
      };

      await listRecursive(prefix);

      if (files.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < files.length; i += chunkSize) {
          await supabaseAdmin.storage.from(bucket).remove(files.slice(i, i + chunkSize));
        }
      }
    };

    const buckets = [
      'clothing-images',
      'avatars',
      'outfit-shares',
      'face-references',
      'generated-looks',
    ];

    await Promise.all(
      buckets.map((bucket) => deleteBucketFiles(bucket, user.id))
    );

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('Failed to delete user:', deleteError);
      return new Response(
        JSON.stringify({ success: false, error: 'No se pudo eliminar la cuenta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting account:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
