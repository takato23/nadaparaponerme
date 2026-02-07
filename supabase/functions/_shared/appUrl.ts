/**
 * Resolve the public app URL used for payment callbacks.
 *
 * Why: Supabase Edge Functions run server-side and don't know whether the caller
 * is localhost, a Vercel preview, or production. For payments we must set
 * callback URLs that match the domain where the user is currently authenticated.
 *
 * Strategy:
 * - Prefer request Origin when it is clearly a dev/preview origin or explicitly allowlisted.
 * - Otherwise fall back to APP_URL secret.
 * - Final fallback is localhost dev.
 */

function parseAllowlist(value: string | undefined): string[] {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAllowedImplicitOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.origin !== origin) return false;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    const host = url.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    // Vercel preview + production default domains
    if (host.endsWith('.vercel.app')) return true;
    return false;
  } catch {
    return false;
  }
}

export function resolveAppUrl(req: Request): string {
  const configured = String(Deno.env.get('APP_URL') || '').trim();

  const originHeader = String(req.headers.get('origin') || '').trim();
  const allowlist = parseAllowlist(Deno.env.get('APP_URL_ALLOWLIST'));
  const originAllowed =
    Boolean(originHeader) &&
    (allowlist.includes(originHeader) || isAllowedImplicitOrigin(originHeader));

  if (originAllowed) return originHeader;
  if (configured) return configured;

  return 'http://localhost:5173';
}

