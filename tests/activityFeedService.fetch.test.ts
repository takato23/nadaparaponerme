import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetSessionUser,
  mockRpc,
  mockFrom,
} = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('../src/services/authService', () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

vi.mock('../src/config/features', () => ({
  getFeatureFlag: vi.fn(() => false),
}));

vi.mock('../src/services/analyticsService', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('../src/services/closetService', () => ({
  addImportedClothingItem: vi.fn(),
}));

vi.mock('../src/services/outfitService', () => ({
  saveOutfit: vi.fn(),
}));

import { fetchActivityFeed } from '../src/services/activityFeedService';

type QueryResult = { data: any; error: any };

function createQuery(result: Promise<QueryResult> | QueryResult) {
  const promise = Promise.resolve(result);
  const query: any = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    filter: vi.fn(() => query),
    eq: vi.fn(() => query),
    or: vi.fn(() => query),
    in: vi.fn(() => query),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return query;
}

describe('activityFeedService.fetchActivityFeed', () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset();
    mockRpc.mockReset();
    mockFrom.mockReset();
    mockGetSessionUser.mockResolvedValue({ id: 'user-1' });
  });

  it('uses direct queries for community feed in local dev', async () => {
    const activityFeedQuery = createQuery({
      data: [
        {
          id: 'activity-1',
          user_id: 'actor-1',
          actor_id: 'actor-1',
          activity_type: 'outfit_shared',
          created_at: '2026-03-11T12:00:00.000Z',
          metadata: {
            visibility: 'community',
            caption: 'Look publicado',
            likes_count: 4,
            comments_count: 1,
            shares_count: 2,
            outfit: { id: 'outfit-1', name: 'Look diario' },
          },
        },
      ],
      error: null,
    });

    const profilesQuery = createQuery({
      data: [
        {
          id: 'actor-1',
          username: 'luna',
          avatar_url: 'https://cdn.example.com/luna.jpg',
          display_name: 'Luna',
        },
      ],
      error: null,
    });

    const emptyQuery = createQuery({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'activity_feed') return activityFeedQuery;
      if (table === 'profiles') return profilesQuery;
      if (table === 'activity_reactions') return emptyQuery;
      if (table === 'content_reports') return emptyQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const feed = await fetchActivityFeed('community');

    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith('activity_feed');
    expect(feed).toHaveLength(1);
    expect(feed[0].user_name).toBe('Luna');
    expect(feed[0].activity_type).toBe('outfit_shared');
    expect(feed[0].metadata_payload?.visibility).toBe('community');
  });

  it('keeps close_friends fallback scoped when RPC fails', async () => {
    mockRpc.mockRejectedValue(new Error('rpc unavailable'));

    const activityFeedQuery = createQuery({
      data: [
        {
          id: 'activity-self',
          user_id: 'user-1',
          actor_id: 'user-1',
          activity_type: 'style_milestone',
          created_at: '2026-03-11T12:10:00.000Z',
          metadata: { visibility: 'followers', caption: 'Mi update' },
        },
        {
          id: 'activity-friend',
          user_id: 'friend-1',
          actor_id: 'friend-1',
          activity_type: 'outfit_shared',
          created_at: '2026-03-11T12:09:00.000Z',
          metadata: { visibility: 'followers', caption: 'Close friend post' },
        },
        {
          id: 'activity-public',
          user_id: 'stranger-1',
          actor_id: 'stranger-1',
          activity_type: 'item_added',
          created_at: '2026-03-11T12:08:00.000Z',
          metadata: { visibility: 'community', caption: 'Public post' },
        },
        {
          id: 'activity-hidden',
          user_id: 'stranger-2',
          actor_id: 'stranger-2',
          activity_type: 'item_added',
          created_at: '2026-03-11T12:07:00.000Z',
          metadata: { visibility: 'followers', caption: 'Should stay hidden' },
        },
      ],
      error: null,
    });

    const closeFriendsQuery = createQuery({
      data: [{ friend_id: 'friend-1' }],
      error: null,
    });

    const profilesQuery = createQuery({
      data: [
        { id: 'user-1', username: 'me', avatar_url: null, display_name: 'Yo' },
        { id: 'friend-1', username: 'luna', avatar_url: null, display_name: 'Luna' },
        { id: 'stranger-1', username: 'sol', avatar_url: null, display_name: 'Sol' },
      ],
      error: null,
    });

    const emptyQuery = createQuery({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'activity_feed') return activityFeedQuery;
      if (table === 'close_friends') return closeFriendsQuery;
      if (table === 'profiles') return profilesQuery;
      if (table === 'activity_reactions') return emptyQuery;
      if (table === 'content_reports') return emptyQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const feed = await fetchActivityFeed('close_friends');

    expect(mockRpc).toHaveBeenCalled();
    expect(feed.map((item) => item.id)).toEqual([
      'activity-self',
      'activity-friend',
      'activity-public',
    ]);
  });
});
