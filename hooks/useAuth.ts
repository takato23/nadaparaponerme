import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../src/lib/supabase';
import {
  AUTH_REQUEST_TIMEOUT_MS,
  getSessionSnapshot,
  rememberAuthSession,
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  signUp as supabaseSignUp,
} from '../src/services/authService';
import { useFeatureFlag } from './useFeatureFlag';
import { getFeatureFlag, setFeatureFlags } from '../src/config/features';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export type UseAuthReturn = AuthState & AuthActions;

type AuthSubscriber = (state: AuthState) => void;

const sharedState: AuthState = {
  user: null,
  loading: true,
  error: null,
};

const subscribers = new Set<AuthSubscriber>();
let initializedSupabaseAuth = false;
let initPromise: Promise<void> | null = null;
let unsubscribeAuth: (() => void) | null = null;
const OAUTH_RETURN_TO_PARAM = 'auth_return_to';

const getOAuthHashParams = (): { accessToken: string; refreshToken: string } | null => {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;

  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) return null;

  return { accessToken, refreshToken };
};

const hasSupabaseOAuthCallback = (): boolean => {
  if (typeof window === 'undefined') return false;

  const url = new URL(window.location.href);
  return Boolean(url.searchParams.get('code')) || getOAuthHashParams() !== null;
};

const cleanOAuthCallbackUrl = () => {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  let shouldReplace = false;

  if (url.searchParams.has('code')) {
    url.searchParams.delete('code');
    shouldReplace = true;
  }

  if (url.searchParams.has('state')) {
    url.searchParams.delete('state');
    shouldReplace = true;
  }

  if (url.searchParams.has(OAUTH_RETURN_TO_PARAM)) {
    url.searchParams.delete(OAUTH_RETURN_TO_PARAM);
    shouldReplace = true;
  }

  if (url.hash.includes('access_token')) {
    url.hash = '';
    shouldReplace = true;
  }

  if (shouldReplace) {
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }
};

const redirectOAuthCallbackToRequestedOrigin = (): boolean => {
  if (typeof window === 'undefined') return false;

  const currentUrl = new URL(window.location.href);
  const returnToRaw = currentUrl.searchParams.get(OAUTH_RETURN_TO_PARAM);
  if (!returnToRaw) return false;

  const hasOAuthPayload = Boolean(currentUrl.searchParams.get('code')) || getOAuthHashParams() !== null;
  if (!hasOAuthPayload) return false;

  try {
    const returnToUrl = new URL(returnToRaw);
    if (returnToUrl.origin === currentUrl.origin) return false;

    currentUrl.searchParams.forEach((value, key) => {
      if (key === OAUTH_RETURN_TO_PARAM) return;
      returnToUrl.searchParams.set(key, value);
    });
    returnToUrl.hash = currentUrl.hash;

    window.location.replace(returnToUrl.toString());
    return true;
  } catch {
    return false;
  }
};

const recoverSessionFromOAuthCallback = async () => {
  if (typeof window === 'undefined') return null;
  if (redirectOAuthCallbackToRequestedOrigin()) return null;

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');

  if (code) {
    const { data, error } = await Promise.race([
      supabase.auth.exchangeCodeForSession(code),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('supabase.auth.exchangeCodeForSession timed out')), AUTH_REQUEST_TIMEOUT_MS);
      }),
    ]);
    if (error) throw error;
    cleanOAuthCallbackUrl();
    rememberAuthSession(data.session ?? null);
    return data.session ?? null;
  }

  const hashTokens = getOAuthHashParams();
  if (hashTokens) {
    const { data, error } = await Promise.race([
      supabase.auth.setSession({
        access_token: hashTokens.accessToken,
        refresh_token: hashTokens.refreshToken,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('supabase.auth.setSession timed out')), AUTH_REQUEST_TIMEOUT_MS);
      }),
    ]);
    if (error) throw error;
    cleanOAuthCallbackUrl();
    rememberAuthSession(data.session ?? null);
    return data.session ?? null;
  }

  return null;
};

const emitSharedState = () => {
  const snapshot: AuthState = {
    user: sharedState.user,
    loading: sharedState.loading,
    error: sharedState.error,
  };
  subscribers.forEach((listener) => listener(snapshot));
};

const setSharedState = (next: Partial<AuthState>) => {
  if (typeof next.user !== 'undefined') sharedState.user = next.user;
  if (typeof next.loading !== 'undefined') sharedState.loading = next.loading;
  if (typeof next.error !== 'undefined') sharedState.error = next.error;
  emitSharedState();
};

const ensureSupabaseAuthInitialized = async () => {
  if (initializedSupabaseAuth) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    setSharedState({ loading: true });
    try {
      let session = await getSessionSnapshot();

      if (!session) {
        session = await recoverSessionFromOAuthCallback();
      }

      rememberAuthSession(session);
      setSharedState({ user: session?.user ?? null, error: null, loading: false });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, authSession) => {
        rememberAuthSession(authSession);
        setSharedState({ user: authSession?.user ?? null });
      });
      unsubscribeAuth = () => subscription.unsubscribe();
      initializedSupabaseAuth = true;
    } catch (error) {
      console.error('Failed to initialize Supabase auth:', error);
      setSharedState({ error: 'Failed to initialize authentication', loading: false });
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
};

const recoverSupabaseAuthMode = async (): Promise<boolean> => {
  try {
    const session = await getSessionSnapshot();

    // Repair stale local feature flags when a real Supabase session already exists
    // or we just returned from an OAuth callback.
    if (!session && !hasSupabaseOAuthCallback()) {
      return false;
    }

    setFeatureFlags({ useSupabaseAuth: true });
    await ensureSupabaseAuthInitialized();
    return true;
  } catch (error) {
    console.warn('Failed to recover Supabase auth mode:', error);
    return false;
  }
};

const getLocalMockUser = (email: string = 'user@example.com'): User => ({
  id: 'local-user',
  email,
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User);

const getLocalMockAuthState = (): AuthState => {
  const isAuthenticated = typeof window !== 'undefined'
    && localStorage.getItem('ojodeloca-is-authenticated') === 'true';

  return {
    user: isAuthenticated ? getLocalMockUser() : null,
    loading: false,
    error: null,
  };
};

const syncLocalMockAuthState = () => {
  const nextState = getLocalMockAuthState();
  setSharedState(nextState);
  return nextState;
};

export const bootstrapAuthState = async () => {
  const useSupabaseAuth = getFeatureFlag('useSupabaseAuth');

  if (useSupabaseAuth) {
    await ensureSupabaseAuthInitialized();
    return;
  }

  const recoveredSupabaseAuth = await recoverSupabaseAuthMode();
  if (recoveredSupabaseAuth) return;

  syncLocalMockAuthState();
};

export function useAuth(): UseAuthReturn {
  const useSupabaseAuth = useFeatureFlag('useSupabaseAuth');
  const [state, setState] = useState<AuthState>({
    user: sharedState.user,
    loading: sharedState.loading,
    error: sharedState.error,
  });

  useEffect(() => {
    let isCancelled = false;

    if (!useSupabaseAuth) {
      const bootstrapLocalMode = async () => {
        const recoveredSupabaseAuth = await recoverSupabaseAuthMode();
        if (isCancelled || recoveredSupabaseAuth) return;

        const nextState = syncLocalMockAuthState();
        setState(nextState);
      };

      void bootstrapLocalMode();
      return () => {
        isCancelled = true;
      };
    }

    const listener: AuthSubscriber = (nextState) => setState(nextState);
    subscribers.add(listener);
    listener({
      user: sharedState.user,
      loading: sharedState.loading,
      error: sharedState.error,
    });
    void ensureSupabaseAuthInitialized();

    return () => {
      isCancelled = true;
      subscribers.delete(listener);
    };
  }, [useSupabaseAuth]);

  const signIn = async (email: string, password: string) => {
    setSharedState({ loading: true, error: null });
    try {
      if (useSupabaseAuth) {
        const data = await supabaseSignIn(email, password);
        rememberAuthSession(data.session ?? null);
        setSharedState({ user: data.user, loading: false, error: null });
      } else {
        localStorage.setItem('ojodeloca-is-authenticated', 'true');
        setState({ user: getLocalMockUser(email), loading: false, error: null });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in';
      setSharedState({ error: message, loading: false });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username: string, displayName?: string) => {
    setSharedState({ loading: true, error: null });
    try {
      if (useSupabaseAuth) {
        const data = await supabaseSignUp(email, password, displayName || username, username);
        rememberAuthSession(data.session ?? null);
        setSharedState({ user: data.user, loading: false, error: null });
      } else {
        localStorage.setItem('ojodeloca-is-authenticated', 'true');
        const localUser = getLocalMockUser(email);
        localUser.user_metadata = { username, display_name: displayName };
        setState({ user: localUser, loading: false, error: null });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign up';
      setSharedState({ error: message, loading: false });
      throw error;
    }
  };

  const signOut = async () => {
    setSharedState({ loading: true, error: null });
    try {
      if (useSupabaseAuth) {
        await supabaseSignOut();
        setSharedState({ user: null, loading: false });
      } else {
        localStorage.removeItem('ojodeloca-is-authenticated');
        setState({ user: null, loading: false, error: null });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign out';
      setSharedState({ error: message, loading: false });
      throw error;
    }
  };

  const clearError = () => {
    setSharedState({ error: null });
  };

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    clearError,
  };
}

// Defensive cleanup for HMR cycles in development.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (unsubscribeAuth) {
      unsubscribeAuth();
      unsubscribeAuth = null;
    }
    initializedSupabaseAuth = false;
    initPromise = null;
  });
}
