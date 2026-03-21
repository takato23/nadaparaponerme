import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetSession,
  mockGetUser,
  mockSignInWithOAuth,
  mockSignOut,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetUser: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
    },
  },
}));

import {
  AUTH_REQUEST_TIMEOUT_MS,
  getSessionUser,
  rememberAuthSession,
  rememberAuthUser,
  resolveAuthRedirectUrl,
  signInWithGoogle,
} from '../src/services/authService';

function createStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  } as Storage;
}

describe('authService', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: createStorageMock(),
      configurable: true,
    });
    window.localStorage.clear();
    rememberAuthSession(null);
    rememberAuthUser(null);
    mockGetSession.mockReset();
    mockGetUser.mockReset();
    mockSignInWithOAuth.mockReset();
    mockSignOut.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the cached browser session when auth bootstrap times out', async () => {
    vi.useFakeTimers();
    mockGetSession.mockImplementation(() => new Promise(() => {}));

    localStorage.setItem(
      'sb-qpoojigxxswkpkfbrfiy-auth-token',
      JSON.stringify({
        access_token: 'token',
        refresh_token: 'refresh',
        user: {
          id: 'user-1',
          email: 'cached@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2026-03-12T00:00:00.000Z',
        },
      })
    );

    const pendingUser = getSessionUser();
    await vi.advanceTimersByTimeAsync(AUTH_REQUEST_TIMEOUT_MS);

    await expect(pendingUser).resolves.toMatchObject({
      id: 'user-1',
      email: 'cached@example.com',
    });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('keeps the full redirect URL in Google OAuth flows', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { provider: 'google' }, error: null });

    await signInWithGoogle('http://localhost:3000/?entry=preview&redirect=%2Fcomunidad');

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/?entry=preview&redirect=%2Fcomunidad',
      },
    });
  });

  it('rebases stale localhost OAuth redirects to the current public origin', () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: new URL('https://ojodeloca.app/invitacion?beta=ABC123'),
      configurable: true,
    });

    try {
      expect(
        resolveAuthRedirectUrl('http://localhost:5173/invitacion?beta=ABC123')
      ).toBe('https://ojodeloca.app/invitacion?beta=ABC123');
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
      });
    }
  });
});
