import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockMaybeSingle,
  mockSelect,
  mockEq,
  mockIs,
  mockGetUser,
} = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockIs: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: mockMaybeSingle,
              })),
            })),
          })),
        };
      }

      if (table === 'outfits') {
        return {
          select: mockSelect,
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  },
}));

vi.mock('../src/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { buildOutfitShareUrl, canUserSaveOutfitToLibrary } from '../src/services/outfitService';

describe('outfitService', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockMaybeSingle.mockReset();
    mockSelect.mockReset();
    mockEq.mockReset();
    mockIs.mockReset();

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
    });

    mockMaybeSingle.mockResolvedValue({
      data: {
        tier: 'free',
        status: 'active',
      },
    });

    mockEq.mockResolvedValue({
      count: 25,
      error: null,
    });

    mockIs.mockReturnValue({
      eq: mockEq,
    });

    mockSelect.mockReturnValue({
      is: mockIs,
    });
  });

  it('blocks saving when the unified library limit is reached', async () => {
    const result = await canUserSaveOutfitToLibrary();
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(25);
    expect(result.reason).toContain('límite');
  });

  it('builds a public share URL from a token', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'https://app.example.com',
      },
    });

    expect(buildOutfitShareUrl('abc123')).toBe('https://app.example.com/look/abc123');
  });
});
