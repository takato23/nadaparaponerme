import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../src/lib/supabase';
import { signIn as supabaseSignIn, signUp as supabaseSignUp, signOut as supabaseSignOut } from '../src/services/authService';
import { useFeatureFlag } from './useFeatureFlag';

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

/**
 * Unified authentication hook
 *
 * Provides authentication state and actions.
 * Switches between localStorage and Supabase based on feature flag.
 */
export function useAuth(): UseAuthReturn {
  const useSupabaseAuth = useFeatureFlag('useSupabaseAuth');

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    if (!useSupabaseAuth) {
      // Use localStorage authentication (legacy)
      initLocalStorageAuth();
      return;
    }

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const initSupabaseAuth = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setUser(session?.user ?? null);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (_event, authSession) => {
            if (!isMounted) return;
            setUser(authSession?.user ?? null);
          }
        );
        unsubscribe = () => subscription.unsubscribe();
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to initialize Supabase auth:', err);
        setError('Failed to initialize authentication');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initSupabaseAuth();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [useSupabaseAuth]);

  const initLocalStorageAuth = () => {
    // Legacy authentication check
    const isAuthenticated = localStorage.getItem('ojodeloca-is-authenticated') === 'true';

    if (isAuthenticated) {
      // Create mock user for localStorage mode
      setUser({
        id: 'local-user',
        email: 'user@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User);
    } else {
      setUser(null);
    }

    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      if (useSupabaseAuth) {
        // Use Supabase authentication
        const data = await supabaseSignIn(email, password);
        setUser(data.user);
      } else {
        // Use localStorage authentication (legacy)
        localStorage.setItem('ojodeloca-is-authenticated', 'true');
        setUser({
          id: 'local-user',
          email,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as User);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    displayName?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      if (useSupabaseAuth) {
        // Use Supabase authentication
        const data = await supabaseSignUp(
          email,
          password,
          displayName || username,
          username
        );
        setUser(data.user);
      } else {
        // Use localStorage authentication (legacy)
        localStorage.setItem('ojodeloca-is-authenticated', 'true');
        setUser({
          id: 'local-user',
          email,
          app_metadata: {},
          user_metadata: { username, display_name: displayName },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as User);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);

    try {
      if (useSupabaseAuth) {
        // Use Supabase authentication
        await supabaseSignOut();
      } else {
        // Use localStorage authentication (legacy)
        localStorage.removeItem('ojodeloca-is-authenticated');
      }
      setUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    clearError,
  };
}
