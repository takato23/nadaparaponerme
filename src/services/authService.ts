import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export const AUTH_REQUEST_TIMEOUT_MS = 8000;
const OAUTH_RETURN_TO_PARAM = 'auth_return_to';

let lastKnownSession: Session | null = null;
let lastKnownUser: User | null = null;

function createTimeoutError(label: string): Error {
  return new Error(`${label} timed out`);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(createTimeoutError(label)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('timed out');
}

function isMissingSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const name = 'name' in error ? String((error as { name?: unknown }).name || '') : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message || '') : '';

  return name === 'AuthSessionMissingError' || message.includes('Auth session missing');
}

function isSessionCandidate(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Session>;
  return typeof candidate.access_token === 'string' && typeof candidate.refresh_token === 'string';
}

function extractStoredSession(parsed: unknown): Session | null {
  if (!parsed) return null;
  if (isSessionCandidate(parsed)) return parsed;
  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      const match = extractStoredSession(entry);
      if (match) return match;
    }
    return null;
  }
  if (typeof parsed === 'object') {
    const objectValues = Object.values(parsed as Record<string, unknown>);
    for (const entry of objectValues) {
      const match = extractStoredSession(entry);
      if (match) return match;
    }
  }
  return null;
}

function readStoredSession(): Session | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !/^sb-.*-auth-token$/.test(key)) continue;

    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const session = extractStoredSession(parsed);
      if (session) return session;
    } catch {
      // Ignore malformed auth cache entries and continue scanning.
    }
  }

  return null;
}

export function rememberAuthSession(session: Session | null | undefined): void {
  lastKnownSession = session ?? null;
  lastKnownUser = session?.user ?? null;
}

export function rememberAuthUser(user: User | null | undefined): void {
  lastKnownUser = user ?? null;
  if (!user) {
    lastKnownSession = null;
  } else if (lastKnownSession?.user?.id === user.id) {
    lastKnownSession = {
      ...lastKnownSession,
      user,
    };
  }
}

const isLocalhostUrl = (value?: string | null): boolean => {
  if (!value) return false;

  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
};

const isVercelPreviewUrl = (value?: string | null): boolean => {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

const resolveAppUrl = (): string => {
  if (typeof window === 'undefined') {
    return String(import.meta.env.VITE_APP_URL || '').trim();
  }

  const currentOrigin = window.location.origin;
  const configuredAppUrl = String(import.meta.env.VITE_APP_URL || '').trim();
  const currentOriginIsLocal = isLocalhostUrl(currentOrigin);

  // In a real browser session on a public domain, always prefer the domain the
  // user is currently on. This avoids stale deploy env values sending OAuth
  // users back to an old Vercel URL or localhost.
  if (currentOrigin && !currentOriginIsLocal) {
    return currentOrigin;
  }

  // Never allow a production/browser session on a real domain to redirect back to localhost.
  if (configuredAppUrl && !(isLocalhostUrl(configuredAppUrl) && !currentOriginIsLocal)) {
    return configuredAppUrl;
  }

  return currentOrigin;
};

export function resolveAuthRedirectUrl(redirectTo?: string): string {
  const baseUrl = resolveAppUrl();
  if (!redirectTo) return baseUrl;

  try {
    const fallback = new URL(baseUrl);
    const candidate = new URL(redirectTo, fallback);
    const fallbackIsLocal = isLocalhostUrl(fallback.toString());
    const candidateIsLocal = isLocalhostUrl(candidate.toString());

    // If a stale caller passes a mismatched or localhost URL while the app is
    // running on a real domain, rebase to the current/public origin but keep
    // path and query so post-auth routing still works.
    if (candidate.origin !== fallback.origin && (!fallbackIsLocal || candidateIsLocal)) {
      candidate.protocol = fallback.protocol;
      candidate.hostname = fallback.hostname;
      candidate.port = fallback.port;
    }

    return candidate.toString();
  } catch {
    return baseUrl;
  }
}

function buildOAuthRedirectTarget(redirectTo?: string): string {
  const requestedTarget = resolveAuthRedirectUrl(redirectTo);
  if (typeof window === 'undefined') return requestedTarget;

  const currentOrigin = window.location.origin;
  const appUrl = resolveAppUrl();

  try {
    const requestedUrl = new URL(requestedTarget);
    const appUrlObject = new URL(appUrl || currentOrigin);

    const shouldBridgeThroughStableHost =
      isVercelPreviewUrl(currentOrigin)
      && appUrlObject.origin !== requestedUrl.origin;

    if (!shouldBridgeThroughStableHost) {
      return requestedTarget;
    }

    appUrlObject.searchParams.set(OAUTH_RETURN_TO_PARAM, requestedUrl.toString());
    return appUrlObject.toString();
  } catch {
    return requestedTarget;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export function normalizeUsername(value?: string | null): string | undefined {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  return normalized || undefined;
}

export function validateUsername(value?: string | null): string | null {
  const normalized = normalizeUsername(value);
  if (!normalized) return null;
  if (normalized.length < 3 || normalized.length > 30) {
    return 'El usuario debe tener entre 3 y 30 caracteres.';
  }
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return 'El usuario solo puede tener letras minúsculas, números y guiones bajos.';
  }
  return null;
}

export async function signUp(email: string, password: string, fullName?: string, username?: string) {
  const normalizedUsername = normalizeUsername(username);
  const usernameError = validateUsername(normalizedUsername);
  if (usernameError) {
    throw new Error(usernameError);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: normalizedUsername,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signInWithGoogle(redirectTo?: string) {
  const safeRedirectTo = buildOAuthRedirectTarget(redirectTo);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: safeRedirectTo,
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  rememberAuthSession(null);
}

export async function getSessionSnapshot(): Promise<Session | null> {
  const fallbackSession = lastKnownSession || readStoredSession();
  if (typeof supabase.auth.getSession !== 'function') {
    return fallbackSession;
  }

  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      AUTH_REQUEST_TIMEOUT_MS,
      'supabase.auth.getSession'
    );
    if (error) throw error;
    rememberAuthSession(data.session ?? null);
    return data.session ?? null;
  } catch (error) {
    if (!isTimeoutError(error)) throw error;

    if (fallbackSession) {
      console.warn('Supabase auth.getSession timed out, using cached browser session.');
      rememberAuthSession(fallbackSession);
      return fallbackSession;
    }

    console.warn('Supabase auth.getSession timed out with no cached browser session.');
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  const session = await getSessionSnapshot();
  if (session?.user) return session.user;

  const fallbackUser = lastKnownUser || readStoredSession()?.user || null;
  if (typeof supabase.auth.getUser !== 'function') {
    return fallbackUser;
  }

  try {
    const { data, error } = await withTimeout(
      supabase.auth.getUser(),
      AUTH_REQUEST_TIMEOUT_MS,
      'supabase.auth.getUser'
    );
    if (error) throw error;
    rememberAuthUser(data.user ?? null);
    return data.user ?? null;
  } catch (error) {
    if (isMissingSessionError(error)) {
      rememberAuthUser(null);
      return null;
    }

    if (!isTimeoutError(error)) throw error;

    if (fallbackUser) {
      console.warn('Supabase auth.getUser timed out, using cached browser user.');
      rememberAuthUser(fallbackUser);
      return fallbackUser;
    }

    console.warn('Supabase auth.getUser timed out with no cached browser user.');
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const user = await getSessionUser();
  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: user.user_metadata?.full_name,
    avatarUrl: user.user_metadata?.avatar_url,
  };
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return data.subscription;
}
