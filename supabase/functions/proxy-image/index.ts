// Supabase Edge Function: Image Proxy
// Bypasses CORS for fetching external e-commerce images to be cut locally.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import {
    assertAllowedOrigin,
    getRequestId,
    isAllowedHost,
    isFailClosedHighCostEnabled,
    isForbiddenHost,
    jsonError,
    parseAllowedHostsEnv,
    parsePositiveIntEnv,
} from '../_shared/security.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};
const PROXY_RATE_LIMIT_PER_MIN = parsePositiveIntEnv('RATE_LIMIT_PROXY_IMAGE_PER_MIN', 10, 1, 240);
const PROXY_TIMEOUT_MS = parsePositiveIntEnv('PROXY_IMAGE_TIMEOUT_MS', 8000, 1000, 30000);
const PROXY_MAX_BYTES = parsePositiveIntEnv('PROXY_IMAGE_MAX_BYTES', 8_388_608, 1024 * 128, 1024 * 1024 * 30);

function uint8ToBase64(bytes: Uint8Array): string {
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
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
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase credentials');
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header', request_id: requestId }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId } },
            );
        }

        const scopedClient = createClient(supabaseUrl, supabaseServiceKey, {
            global: { headers: { Authorization: authHeader } },
        });
        supabase = scopedClient;

        const { data: { user }, error: userError } = await scopedClient.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized', request_id: requestId }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId } },
            );
        }
        userId = user.id;

        const rateLimit = await enforceRateLimit(scopedClient, user.id, 'proxy-image', {
            windowSeconds: 60,
            maxRequests: PROXY_RATE_LIMIT_PER_MIN,
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
                error: 'Rate limit exceeded',
                code: rateLimit.reason === 'blocked' ? 'blocked' : 'rate_limited',
                corsHeaders,
                retryAfterSeconds: rateLimit.retryAfterSeconds || 60,
            });
        }

        const { url } = await req.json();
        if (!url || typeof url !== 'string') {
            return jsonError({
                status: 400,
                requestId,
                error: 'Missing or invalid "url" payload',
                code: 'invalid_url',
                corsHeaders,
            });
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return jsonError({
                status: 400,
                requestId,
                error: 'Invalid URL',
                code: 'invalid_url',
                corsHeaders,
            });
        }

        if (parsedUrl.protocol !== 'https:') {
            return jsonError({
                status: 400,
                requestId,
                error: 'Only HTTPS URLs are allowed',
                code: 'invalid_url',
                corsHeaders,
            });
        }

        const allowedHosts = parseAllowedHostsEnv('PROXY_IMAGE_ALLOWED_HOSTS');
        if (allowedHosts.size === 0 && isFailClosedHighCostEnabled()) {
            return jsonError({
                status: 503,
                requestId,
                error: 'Security host allowlist is not configured',
                code: 'security_guard_error',
                corsHeaders,
            });
        }

        const inputHost = parsedUrl.hostname.toLowerCase();
        if (isForbiddenHost(inputHost)) {
            return jsonError({
                status: 400,
                requestId,
                error: 'Forbidden target host',
                code: 'invalid_url',
                corsHeaders,
            });
        }
        if (allowedHosts.size > 0 && !isAllowedHost(inputHost, allowedHosts)) {
            return jsonError({
                status: 403,
                requestId,
                error: 'Host is not in allowed list',
                code: 'forbidden_origin',
                corsHeaders,
            });
        }

        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), PROXY_TIMEOUT_MS);
        const imageRes = await fetch(parsedUrl.toString(), {
            headers: {
                // Mimic a standard browser to avoid getting blocked by basic anti-bot simple rules from stores
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            },
            signal: timeoutController.signal,
        });
        clearTimeout(timeoutId);

        if (!imageRes.ok) {
            throw new Error(`Failed to fetch image: ${imageRes.status} ${imageRes.statusText}`);
        }

        const finalUrl = new URL(imageRes.url || parsedUrl.toString());
        const finalHost = finalUrl.hostname.toLowerCase();
        if (isForbiddenHost(finalHost) || (allowedHosts.size > 0 && !isAllowedHost(finalHost, allowedHosts))) {
            return jsonError({
                status: 403,
                requestId,
                error: 'Redirect target is not allowed',
                code: 'forbidden_origin',
                corsHeaders,
            });
        }

        const contentType = String(imageRes.headers.get('content-type') || '').toLowerCase();
        if (!contentType.startsWith('image/')) {
            return jsonError({
                status: 415,
                requestId,
                error: 'Unsupported content type',
                code: 'unsupported_content_type',
                corsHeaders,
            });
        }

        const contentLength = Number(imageRes.headers.get('content-length') || 0);
        if (contentLength > PROXY_MAX_BYTES) {
            return jsonError({
                status: 413,
                requestId,
                error: 'Payload too large',
                code: 'payload_too_large',
                corsHeaders,
            });
        }

        if (!imageRes.body) {
            throw new Error('Response body is empty');
        }

        const reader = imageRes.body.getReader();
        const chunks: Uint8Array[] = [];
        let total = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;
            total += value.byteLength;
            if (total > PROXY_MAX_BYTES) {
                return jsonError({
                    status: 413,
                    requestId,
                    error: 'Payload too large',
                    code: 'payload_too_large',
                    corsHeaders,
                });
            }
            chunks.push(value);
        }

        const merged = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
        }

        const base64Data = uint8ToBase64(merged);
        const dataUrl = `data:${contentType};base64,${base64Data}`;
        await recordRequestResult(scopedClient, user.id, 'proxy-image', true);

        return new Response(JSON.stringify({ dataUrl }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
        });

    } catch (error: any) {
        console.error('Proxy Image Error:', error);
        if (supabase && userId) {
            await recordRequestResult(supabase, userId, 'proxy-image', false);
        }
        if (error?.name === 'AbortError') {
            return jsonError({
                status: 504,
                requestId,
                error: 'Upstream image fetch timed out',
                code: 'security_guard_error',
                corsHeaders,
            });
        }
        return new Response(
            JSON.stringify({ error: error.message || 'Error occurred', request_id: requestId }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId } },
        );
    }
});
