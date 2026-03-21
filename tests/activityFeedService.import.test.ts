import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityFeedItem, ClothingItem } from '../types';

const {
  mockGetSessionUser,
  mockFrom,
  mockAddImportedClothingItem,
  mockSaveOutfit,
  mockGetFeatureFlag,
  mockTrackEvent,
} = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockFrom: vi.fn(),
  mockAddImportedClothingItem: vi.fn(),
  mockSaveOutfit: vi.fn(),
  mockGetFeatureFlag: vi.fn(),
  mockTrackEvent: vi.fn(),
}));

vi.mock('../src/services/authService', () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

vi.mock('../src/services/closetService', () => ({
  addImportedClothingItem: mockAddImportedClothingItem,
}));

vi.mock('../src/services/outfitService', () => ({
  saveOutfit: mockSaveOutfit,
}));

vi.mock('../src/config/features', () => ({
  getFeatureFlag: mockGetFeatureFlag,
}));

vi.mock('../src/services/analyticsService', () => ({
  trackEvent: mockTrackEvent,
}));

import {
  importFromActivity,
  publishItemToTimeline,
  publishOutfitToTimeline
} from '../src/services/activityFeedService';

const baseSnapshot: ClothingItem = {
  id: 'snap-item-1',
  imageDataUrl: 'https://cdn.example.com/item.jpg',
  metadata: {
    category: 'top',
    subcategory: 'Camisa blanca',
    color_primary: 'blanco',
    vibe_tags: ['casual'],
    seasons: ['summer'],
  },
};

const makeItemActivity = (): ActivityFeedItem => ({
  id: 'activity-item-1',
  user_id: 'friend-1',
  user_name: 'Luna',
  activity_type: 'item_added',
  timestamp: new Date().toISOString(),
  clothing_item: baseSnapshot,
  likes_count: 0,
  comments_count: 0,
  shares_count: 0,
  is_liked: false,
  is_shared: false,
  metadata_payload: {},
});

const makeOutfitActivity = (): ActivityFeedItem => ({
  id: 'activity-outfit-1',
  user_id: 'friend-1',
  user_name: 'Luna',
  activity_type: 'outfit_shared',
  timestamp: new Date().toISOString(),
  outfit: {
    id: 'outfit-1',
    top_id: 't1',
    bottom_id: 'b1',
    shoes_id: 's1',
    explanation: 'Outfit de prueba',
  },
  likes_count: 0,
  comments_count: 0,
  shares_count: 0,
  is_liked: false,
  is_shared: false,
  metadata_payload: {
    outfit_bundle: {
      top: { ...baseSnapshot, id: 'top-1', metadata: { ...baseSnapshot.metadata, category: 'top' } },
      bottom: { ...baseSnapshot, id: 'bottom-1', metadata: { ...baseSnapshot.metadata, category: 'bottom' } },
      shoes: { ...baseSnapshot, id: 'shoes-1', metadata: { ...baseSnapshot.metadata, category: 'shoes' } },
    }
  },
});

describe('activityFeedService.importFromActivity', () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset();
    mockFrom.mockReset();
    mockAddImportedClothingItem.mockReset();
    mockSaveOutfit.mockReset();
    mockGetFeatureFlag.mockReset();
    mockTrackEvent.mockReset();

    mockGetSessionUser.mockResolvedValue({ id: 'user-1' });
    mockGetFeatureFlag.mockImplementation((flag: string) => {
      if (flag === 'enableLinkedSourceItems') return true;
      if (flag === 'useSupabaseOutfits') return false;
      return false;
    });
    mockAddImportedClothingItem.mockImplementation(async (input: any) => ({
      id: `imported-${Math.random().toString(16).slice(2, 8)}`,
      imageDataUrl: input.imageSource,
      metadata: input.metadata,
      status: input.status,
      isFavorite: input.isFavorite,
      linkMode: input.linkMode,
      sourceRef: input.sourceRef,
    }));
  });

  it('imports item activity as wishlist in save mode', async () => {
    const activity = makeItemActivity();

    const result = await importFromActivity(activity, 'save');

    expect(result.importedItems).toHaveLength(1);
    expect(mockAddImportedClothingItem).toHaveBeenCalledTimes(1);
    expect(mockAddImportedClothingItem).toHaveBeenCalledWith(expect.objectContaining({
      status: 'wishlist',
      isFavorite: false,
      linkMode: 'linked',
      sourceRef: expect.objectContaining({
        originType: 'activity_item',
        originActivityId: 'activity-item-1',
      }),
    }));
  });

  it('imports item activity as wishlist+favorite in wish mode', async () => {
    const activity = makeItemActivity();

    await importFromActivity(activity, 'wish');

    expect(mockAddImportedClothingItem).toHaveBeenCalledWith(expect.objectContaining({
      status: 'wishlist',
      isFavorite: true,
      linkMode: 'linked',
    }));
  });

  it('imports outfit activity (3 snapshots) and creates outfit when enabled', async () => {
    const activity = makeOutfitActivity();
    mockGetFeatureFlag.mockImplementation((flag: string) => {
      if (flag === 'enableLinkedSourceItems') return true;
      if (flag === 'useSupabaseOutfits') return true;
      return false;
    });
    mockSaveOutfit.mockResolvedValue({
      id: 'saved-outfit-1',
      top_id: 'imported-top',
      bottom_id: 'imported-bottom',
      shoes_id: 'imported-shoes',
      explanation: 'Outfit importado',
    });

    const importedIds = ['imported-top', 'imported-bottom', 'imported-shoes'];
    mockAddImportedClothingItem
      .mockResolvedValueOnce({ ...baseSnapshot, id: importedIds[0], metadata: { ...baseSnapshot.metadata, category: 'top' } })
      .mockResolvedValueOnce({ ...baseSnapshot, id: importedIds[1], metadata: { ...baseSnapshot.metadata, category: 'bottom' } })
      .mockResolvedValueOnce({ ...baseSnapshot, id: importedIds[2], metadata: { ...baseSnapshot.metadata, category: 'shoes' } });

    const result = await importFromActivity(activity, 'save');

    expect(result.importedItems).toHaveLength(3);
    expect(mockAddImportedClothingItem).toHaveBeenCalledTimes(3);
    expect(mockSaveOutfit).toHaveBeenCalledTimes(1);
    expect(mockSaveOutfit).toHaveBeenCalledWith(expect.objectContaining({
      top_id: importedIds[0],
      bottom_id: importedIds[1],
      shoes_id: importedIds[2],
    }));
  });

  it('returns missing slots when outfit bundle is incomplete', async () => {
    const activity = makeOutfitActivity();
    activity.metadata_payload = {
      outfit_bundle: {
        top: activity.metadata_payload?.outfit_bundle?.top,
        bottom: activity.metadata_payload?.outfit_bundle?.bottom,
      },
    };

    const result = await importFromActivity(activity, 'save');

    expect(result.importedItems).toHaveLength(2);
    expect(result.missingSlots).toContain('shoes');
    expect(mockSaveOutfit).not.toHaveBeenCalled();
  });
});

describe('activityFeedService.publish*', () => {
  beforeEach(() => {
    mockGetSessionUser.mockResolvedValue({ id: 'user-1' });
    mockTrackEvent.mockReset();
    mockFrom.mockReset();

    const builder: any = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValue(builder);
  });

  it('publishes item snapshot with followers visibility by default', async () => {
    await publishItemToTimeline(baseSnapshot);

    expect(mockFrom).toHaveBeenCalledWith('activity_feed');
    const builder = mockFrom.mock.results[0]?.value;
    expect(builder.insert).toHaveBeenCalledTimes(1);
    const insertPayload = builder.insert.mock.calls[0][0];
    expect(insertPayload.activity_type).toBe('item_added');
    expect(insertPayload.metadata.visibility).toBe('followers');
    expect(insertPayload.metadata.clothing_item.metadata.subcategory).toBe('Camisa blanca');
  });

  it('publishes outfit bundle with community visibility', async () => {
    const outfit = {
      id: 'outfit-1',
      top_id: 'top-1',
      bottom_id: 'bottom-1',
      shoes_id: 'shoes-1',
      explanation: 'Outfit test',
    };

    await publishOutfitToTimeline(outfit, {
      top: { ...baseSnapshot, id: 'top-1', metadata: { ...baseSnapshot.metadata, category: 'top' } },
      bottom: { ...baseSnapshot, id: 'bottom-1', metadata: { ...baseSnapshot.metadata, category: 'bottom' } },
      shoes: { ...baseSnapshot, id: 'shoes-1', metadata: { ...baseSnapshot.metadata, category: 'shoes' } },
    }, { visibility: 'community' });

    const builder = mockFrom.mock.results[0]?.value;
    const insertPayload = builder.insert.mock.calls[0][0];
    expect(insertPayload.activity_type).toBe('outfit_shared');
    expect(insertPayload.metadata.visibility).toBe('community');
    expect(insertPayload.metadata.outfit_bundle.top.id).toBe('top-1');
  });
});
