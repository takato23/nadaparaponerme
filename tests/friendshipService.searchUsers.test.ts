import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetUser, mockRpc, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    rpc: mockRpc,
    from: mockFrom,
  },
}));

import { searchUsers } from '../src/services/friendshipService';

type MockProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
};

const makeProfilesQueryBuilder = (data: MockProfile[], error: unknown = null) => {
  const builder: any = {};
  builder.select = vi.fn(() => builder);
  builder.neq = vi.fn(() => builder);
  builder.ilike = vi.fn(() => builder);
  builder.limit = vi.fn().mockResolvedValue({ data, error });
  return builder;
};

describe('friendshipService.searchUsers', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockRpc.mockReset();
    mockFrom.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns RPC results and normalizes query', async () => {
    const rpcResults: MockProfile[] = [
      {
        id: 'p1',
        username: 'sofi',
        display_name: 'Sofi',
        avatar_url: null,
        bio: null,
        is_public: true,
      },
    ];

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockRpc.mockResolvedValue({ data: rpcResults, error: null });

    const results = await searchUsers('@sofi');

    expect(results).toEqual(rpcResults);
    expect(mockRpc).toHaveBeenCalledWith('search_profiles_for_friendship', {
      p_user_id: 'user-1',
      p_query: 'sofi',
      p_limit: 20,
    });
  });

  it('falls back to legacy search when RPC fails', async () => {
    const usernameMatch: MockProfile[] = [
      {
        id: 'p1',
        username: 'ana_123',
        display_name: 'Ana',
        avatar_url: null,
        bio: null,
        is_public: true,
      },
    ];
    const displayNameMatch: MockProfile[] = [
      {
        id: 'p1',
        username: 'ana_123',
        display_name: 'Ana',
        avatar_url: null,
        bio: null,
        is_public: true,
      },
      {
        id: 'p2',
        username: 'annalu',
        display_name: 'Ana Lucia',
        avatar_url: null,
        bio: null,
        is_public: true,
      },
    ];

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'function not found' } });
    mockFrom
      .mockReturnValueOnce(makeProfilesQueryBuilder(usernameMatch))
      .mockReturnValueOnce(makeProfilesQueryBuilder(displayNameMatch));

    const results = await searchUsers('ana');

    expect(results).toHaveLength(2);
    expect(results.map((profile) => profile.id)).toEqual(['p1', 'p2']);
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('returns empty array for short queries', async () => {
    const results = await searchUsers('a');

    expect(results).toEqual([]);
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
