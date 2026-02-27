export type EdgeErrorCode =
  | 'rate_limited'
  | 'blocked'
  | 'forbidden_origin'
  | 'invalid_url'
  | 'payload_too_large'
  | 'unsupported_content_type'
  | 'security_guard_error';

type JsonErrorInput = {
  status: number;
  requestId: string;
  error: string;
  code: EdgeErrorCode;
  corsHeaders: Record<string, string>;
  retryAfterSeconds?: number;
};

function normalizeCsvValue(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeOrigin(value: string): string {
  return value.trim().toLowerCase().replace(/\/+$/, '');
}

function isIPv4(host: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
}

function isIPv6(host: string): boolean {
  return host.includes(':');
}

function isPrivateIPv4(host: string): boolean {
  const parts = host.split('.').map((segment) => Number(segment));
  if (parts.length !== 4 || parts.some((segment) => !Number.isInteger(segment) || segment < 0 || segment > 255)) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIPv6(host: string): boolean {
  const normalized = host.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  );
}

export function getRequestId(req: Request): string {
  const fromHeader = req.headers.get('x-request-id') || req.headers.get('x-correlation-id');
  const normalized = fromHeader?.trim();
  return normalized && normalized.length > 0 ? normalized.slice(0, 120) : crypto.randomUUID();
}

export function getClientIp(req: Request): string | null {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const first = xForwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const cfIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;
  return null;
}

type AssertAllowedOriginOptions = {
  requireConfigured?: boolean;
};

export function assertAllowedOrigin(
  req: Request,
  options: AssertAllowedOriginOptions = {},
): { allowed: boolean; origin: string | null; missingConfig?: boolean } {
  const configured = String(Deno.env.get('ALLOWED_WEB_ORIGINS') || '').trim();
  const origin = req.headers.get('origin');
  if (!configured) {
    if (options.requireConfigured && isFailClosedHighCostEnabled()) {
      return { allowed: false, origin, missingConfig: true };
    }
    return { allowed: true, origin };
  }

  if (!origin) {
    return { allowed: true, origin: null };
  }

  const allowedOrigins = normalizeCsvValue(configured);
  if (allowedOrigins.includes('*')) {
    return { allowed: true, origin };
  }

  const normalizedOrigin = normalizeOrigin(origin);
  const allowed = allowedOrigins.some((allowedOrigin) => normalizeOrigin(allowedOrigin) === normalizedOrigin);
  return { allowed, origin };
}

export function parsePositiveIntEnv(
  envName: string,
  fallback: number,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
): number {
  const raw = Deno.env.get(envName);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  return Math.min(max, Math.max(min, normalized));
}

export function isFailClosedHighCostEnabled(): boolean {
  return String(Deno.env.get('SECURITY_FAIL_CLOSED_HIGH_COST') || '').toLowerCase() === 'true';
}

export function parseAllowedHostsEnv(envName: string): Set<string> {
  const raw = String(Deno.env.get(envName) || '');
  return new Set(normalizeCsvValue(raw));
}

export function isForbiddenHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return true;

  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '0.0.0.0' || host === '127.0.0.1') return true;
  if (host === '::1') return true;
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan')) return true;

  if (isIPv4(host)) return isPrivateIPv4(host);
  if (isIPv6(host)) return isPrivateIPv6(host);
  return false;
}

export function isAllowedHost(hostname: string, allowedHosts: Set<string>): boolean {
  if (allowedHosts.size === 0) return false;
  const normalized = hostname.toLowerCase();

  for (const allowed of allowedHosts) {
    if (!allowed) continue;
    if (normalized === allowed) return true;
    if (normalized.endsWith(`.${allowed}`)) return true;
  }

  return false;
}

export function jsonError({
  status,
  requestId,
  error,
  code,
  corsHeaders,
  retryAfterSeconds,
}: JsonErrorInput): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
  };

  if (typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0) {
    headers['Retry-After'] = String(retryAfterSeconds);
  }

  return new Response(
    JSON.stringify({
      error,
      code,
      retry_after_seconds: typeof retryAfterSeconds === 'number' ? retryAfterSeconds : undefined,
      request_id: requestId,
    }),
    { status, headers },
  );
}
