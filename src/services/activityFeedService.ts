/**
 * Activity Feed Service
 *
 * Social feed helpers: publish, import from activity, reactions, comments.
 * Uses Supabase RPCs when available and degrades gracefully to direct table access.
 */

import type {
  ActivityFeedItem,
  ActivityComment,
  ActivityType,
  ClothingItem,
  SavedOutfit,
  TimelineVisibility,
} from '../../types';
import type { User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { dataUrlToFile, uploadImage } from '../lib/supabase';
import { getFeatureFlag } from '../config/features';
import { getSessionUser } from './authService';
import * as analytics from './analyticsService';
import * as closetService from './closetService';
import * as outfitService from './outfitService';

type TimelineVisibilityInput = TimelineVisibility | 'friends';
type ImportMode = 'save' | 'wish';
type OutfitBundle = {
  top?: ClothingItem;
  bottom?: ClothingItem;
  shoes?: ClothingItem;
};

export type ImportFromActivityResult = {
  importedItems: ClothingItem[];
  importedOutfit?: SavedOutfit | null;
  missingSlots?: string[];
};

type PublishItemOptions = {
  caption?: string;
  tags?: string[];
  visibility?: TimelineVisibilityInput;
};

type PublishOutfitOptions = {
  caption?: string;
  tags?: string[];
  visibility?: TimelineVisibilityInput;
};

type PublishSocialPostOptions = {
  caption?: string;
  imageDataUrl?: string;
  visibility?: TimelineVisibilityInput;
};

type ToggleReactionResult = {
  isActive: boolean;
  likesCount: number;
  sharesCount: number;
};

type ToggleCommentLikeResult = {
  isActive: boolean;
  likesCount: number;
};

const ACTIVITY_FEED_REQUEST_TIMEOUT_MS = 8000;

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

function isUuid(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function toUuidOrRandom(value: string | undefined | null): string {
  return isUuid(value) ? String(value) : crypto.randomUUID();
}

function normalizeVisibility(visibility?: TimelineVisibilityInput): TimelineVisibility {
  if (visibility === 'community') return 'community';
  return 'followers';
}

function getFeedItemVisibility(metadata: unknown): TimelineVisibility {
  const record = metadata && typeof metadata === 'object' ? metadata as Record<string, unknown> : {};
  return record.visibility === 'community' ? 'community' : 'followers';
}

function serializeClothingSnapshot(item: ClothingItem): ClothingItem {
  return {
    id: item.id,
    imageDataUrl: item.imageDataUrl,
    backImageDataUrl: item.backImageDataUrl,
    metadata: {
      category: item.metadata?.category || 'top',
      subcategory: item.metadata?.subcategory || 'Prenda',
      color_primary: item.metadata?.color_primary || 'desconocido',
      neckline: item.metadata?.neckline,
      sleeve_type: item.metadata?.sleeve_type,
      vibe_tags: item.metadata?.vibe_tags || [],
      seasons: item.metadata?.seasons || [],
      description: item.metadata?.description,
    },
    status: item.status || 'owned',
    isFavorite: Boolean(item.isFavorite),
    linkMode: item.linkMode || 'copy',
    sourceRef: item.sourceRef,
  };
}

function extractOutfitBundle(activity: ActivityFeedItem): OutfitBundle {
  const metadata = activity.metadata_payload || {};
  const bundle = metadata?.outfit_bundle || {};
  return {
    top: bundle?.top as ClothingItem | undefined,
    bottom: bundle?.bottom as ClothingItem | undefined,
    shoes: bundle?.shoes as ClothingItem | undefined,
  };
}

function normalizeSnapshotForImport(snapshot: any): ClothingItem | undefined {
  if (!snapshot || typeof snapshot !== 'object') return undefined;

  const metadata = snapshot.metadata || {};
  const imageDataUrl =
    snapshot.imageDataUrl ||
    snapshot.image_url ||
    snapshot.thumbnail_url ||
    snapshot.backImageDataUrl ||
    snapshot.back_image_url;

  if (!imageDataUrl) return undefined;

  return {
    id: snapshot.id || `snapshot-${crypto.randomUUID()}`,
    imageDataUrl,
    backImageDataUrl: snapshot.backImageDataUrl || snapshot.back_image_url,
    metadata: {
      category: metadata.category || snapshot.category || snapshot.ai_metadata?.category_detected || 'top',
      subcategory: metadata.subcategory || snapshot.subcategory || snapshot.name || 'Prenda descubierta',
      color_primary: metadata.color_primary || snapshot.color_primary || snapshot.ai_metadata?.colors?.[0] || 'desconocido',
      neckline: metadata.neckline || snapshot.neckline || snapshot.ai_metadata?.neckline,
      sleeve_type: metadata.sleeve_type || snapshot.sleeve_type || snapshot.ai_metadata?.sleeve_type,
      vibe_tags: metadata.vibe_tags || snapshot.vibe_tags || snapshot.ai_metadata?.vibe_tags || snapshot.tags || [],
      seasons: metadata.seasons || snapshot.seasons || snapshot.ai_metadata?.seasons || [],
      description: metadata.description || snapshot.description || snapshot.notes,
    },
    status: snapshot.status || 'owned',
    isFavorite: Boolean(snapshot.isFavorite ?? snapshot.is_favorite),
    linkMode: snapshot.linkMode || snapshot.link_mode || 'copy',
    sourceRef: snapshot.sourceRef || snapshot.source_ref,
  };
}

function hasImportableSnapshot(item: ClothingItem | undefined): boolean {
  const normalized = normalizeSnapshotForImport(item);
  return Boolean(
    normalized &&
    normalized.imageDataUrl &&
    normalized.metadata?.category &&
    normalized.metadata?.subcategory
  );
}

async function getAuthenticatedUser(): Promise<User | null> {
  return getSessionUser();
}

async function hydrateCurrentUserReactions(activities: ActivityFeedItem[]): Promise<ActivityFeedItem[]> {
  try {
    if (activities.length === 0) return activities;

    const user = await getAuthenticatedUser();
    if (!user) return activities;

    const ids = activities.map((activity) => activity.id).filter(Boolean);
    if (ids.length === 0) return activities;

    const { data, error } = await withTimeout(
      supabase
        .from('activity_reactions')
        .select('activity_id, reaction_type')
        .eq('user_id', user.id)
        .in('activity_id', ids),
      ACTIVITY_FEED_REQUEST_TIMEOUT_MS,
      'hydrateCurrentUserReactions.query'
    );

    if (error) return activities;

    const liked = new Set<string>();
    const shared = new Set<string>();

    for (const row of data || []) {
      if (row.reaction_type === 'like') liked.add(row.activity_id as string);
      if (row.reaction_type === 'share') shared.add(row.activity_id as string);
    }

    return activities.map((activity) => {
      const isLiked = liked.has(activity.id);
      const isShared = shared.has(activity.id);
      return {
        ...activity,
        is_liked: isLiked,
        is_shared: isShared,
        isLikedByMe: isLiked,
        isSharedByMe: isShared,
      };
    });
  } catch {
    return activities;
  }
}

async function getMyReportedTargetIds(
  targetType: 'activity' | 'comment',
  targetIds: string[]
): Promise<Set<string>> {
  try {
    if (targetIds.length === 0) return new Set();

    const user = await getAuthenticatedUser();
    if (!user) return new Set();

    const { data, error } = await withTimeout(
      supabase
        .from('content_reports')
        .select('target_id')
        .eq('reporter_id', user.id)
        .eq('target_type', targetType)
        .in('target_id', targetIds),
      ACTIVITY_FEED_REQUEST_TIMEOUT_MS,
      'getMyReportedTargetIds.query'
    );

    if (error) return new Set();
    return new Set((data || []).map((row: any) => String(row.target_id)).filter(Boolean));
  } catch {
    return new Set();
  }
}

async function hydrateCommentLikes(comments: ActivityComment[]): Promise<ActivityComment[]> {
  try {
    if (comments.length === 0) return comments;
    const ids = comments.map((comment) => comment.id);
    const user = await getAuthenticatedUser();
    if (!user) return comments;

    const { data, error } = await withTimeout(
      supabase
        .from('activity_comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', ids),
      ACTIVITY_FEED_REQUEST_TIMEOUT_MS,
      'hydrateCommentLikes.query'
    );

    if (error) return comments;

    const likesCountMap = new Map<string, number>();
    const likedByMe = new Set<string>();

    for (const row of data || []) {
      const commentId = String(row.comment_id || '');
      if (!commentId) continue;
      likesCountMap.set(commentId, (likesCountMap.get(commentId) || 0) + 1);
      if (row.user_id === user.id) {
        likedByMe.add(commentId);
      }
    }

    return comments.map((comment) => ({
      ...comment,
      likes_count: likesCountMap.get(comment.id) || 0,
      is_liked: likedByMe.has(comment.id),
    }));
  } catch {
    return comments;
  }
}

export function normalizeActivityType(activityType: string): ActivityType {
  if (activityType === 'borrow_requested') {
    return 'borrow_request';
  }
  return activityType as ActivityType;
}

function mapFeedRows(data: any[]): ActivityFeedItem[] {
  return (data || []).map((item: any) => {
    const metadata = item.metadata || {};
    return {
      id: item.id,
      user_id: item.actor_id || item.user_id,
      actor_id: item.actor_id,
      user_name: item.actor_display_name || item.actor_username || 'Usuario',
      user_avatar: item.actor_avatar,
      activity_type: normalizeActivityType(item.activity_type),
      timestamp: item.created_at,
      caption: metadata.caption,
      tags: metadata.tags,
      likes_count: Number(metadata.likes_count || 0),
      comments_count: Number(metadata.comments_count || 0),
      shares_count: Number(metadata.shares_count || 0),
      is_liked: Boolean(metadata.is_liked),
      is_shared: Boolean(metadata.is_shared),
      isLikedByMe: Boolean(metadata.is_liked),
      isSharedByMe: Boolean(metadata.is_shared),
      outfit: metadata.outfit,
      clothing_item: metadata.clothing_item,
      challenge: metadata.challenge,
      capsule: metadata.capsule,
      lookbook: metadata.lookbook,
      outfit_rating: metadata.outfit_rating,
      metadata_payload: metadata,
    } satisfies ActivityFeedItem;
  });
}

async function fetchActivityFeedDirect(
  userId: string,
  filter: 'all' | 'close_friends' | 'community',
  page: number,
  limit: number,
  targetActorId?: string
): Promise<ActivityFeedItem[]> {
  const from = page * limit;
  const overscan = Math.max(limit * 5, 100);
  const to = Math.max(limit - 1, ((page + 1) * overscan) - 1);

  let followedActorIds = new Set<string>();
  let closeFriendActorIds = new Set<string>();

  if (filter === 'all') {
    const { data: follows, error: followsError } = await withTimeout(
      supabase
        .from('user_follows')
        .select('followee_id')
        .eq('follower_id', userId)
        .eq('status', 'active'),
      ACTIVITY_FEED_REQUEST_TIMEOUT_MS,
      'fetchActivityFeedDirect.userFollows'
    );
    if (followsError) throw followsError;
    followedActorIds = new Set(
      (follows || []).map((row: any) => String(row.followee_id || '')).filter(Boolean)
    );
  }

  if (filter === 'close_friends') {
    const { data: closeFriends, error: closeFriendsError } = await withTimeout(
      supabase
        .from('close_friends')
        .select('friend_id')
        .eq('user_id', userId),
      ACTIVITY_FEED_REQUEST_TIMEOUT_MS,
      'fetchActivityFeedDirect.closeFriends'
    );
    if (closeFriendsError) throw closeFriendsError;
    closeFriendActorIds = new Set(
      (closeFriends || []).map((row: any) => String(row.friend_id || '')).filter(Boolean)
    );
  }

  let query = supabase
    .from('activity_feed')
    .select('id, user_id, actor_id, activity_type, metadata, created_at')
    .order('created_at', { ascending: false })
    .range(0, to);

  if (targetActorId) {
    query = query.eq('actor_id', targetActorId);
  }

  if (filter === 'community') {
    query = query.filter('metadata->>visibility', 'eq', 'community');
  }

  const { data, error } = await withTimeout(
    query,
    ACTIVITY_FEED_REQUEST_TIMEOUT_MS,
    'fetchActivityFeedDirect.activityFeed'
  );
  if (error) throw error;

  const filteredData = (data || []).filter((item: any) => {
    const actorId = String(item?.actor_id || '');
    const visibility = getFeedItemVisibility(item?.metadata);

    if (!actorId) return false;
    if (filter === 'community') return visibility === 'community';
    if (filter === 'close_friends') {
      return actorId === userId
        || visibility === 'community'
        || (visibility === 'followers' && closeFriendActorIds.has(actorId));
    }

    return actorId === userId
      || visibility === 'community'
      || (visibility === 'followers' && followedActorIds.has(actorId));
  }).slice(from, from + limit);

  const actorIds = Array.from(
    new Set(
      filteredData
        .map((item: any) => String(item.actor_id || ''))
        .filter(Boolean)
    )
  );

  const profileMap = new Map<string, { username?: string; avatar_url?: string; display_name?: string }>();
  if (actorIds.length > 0) {
    const { data: profiles, error: profilesError } = await withTimeout(
      supabase
        .from('profiles')
        .select('id, username, avatar_url, display_name')
        .in('id', actorIds),
      ACTIVITY_FEED_REQUEST_TIMEOUT_MS,
      'fetchActivityFeedDirect.profiles'
    );

    if (profilesError) throw profilesError;
    for (const profile of profiles || []) {
      profileMap.set(String(profile.id), profile);
    }
  }

  const enriched = filteredData.map((item: any) => {
    const profile = profileMap.get(String(item.actor_id || ''));
    return {
      ...item,
      actor_username: profile?.username || null,
      actor_avatar: profile?.avatar_url || null,
      actor_display_name: profile?.display_name || null,
    };
  });

  return mapFeedRows(enriched);
}

/**
 * Fetches the activity feed from Supabase.
 */
export async function fetchActivityFeed(
  filter: 'all' | 'close_friends' | 'community' = 'all',
  page: number = 0,
  limit: number = 20,
  targetActorId?: string
): Promise<ActivityFeedItem[]> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    let mapped: ActivityFeedItem[] = [];
    const preferDirectQueryInDev = import.meta.env.DEV && filter === 'community' && !targetActorId;

    if (preferDirectQueryInDev) {
      mapped = await fetchActivityFeedDirect(user.id, filter, page, limit, targetActorId);
    } else {
      try {
        const { data, error } = await withTimeout(
          supabase.rpc('get_user_feed', {
            p_user_id: user.id,
            p_filter_type: filter,
            p_limit: limit,
            p_offset: page * limit,
            p_target_actor_id: targetActorId || null,
          }),
          ACTIVITY_FEED_REQUEST_TIMEOUT_MS,
          'fetchActivityFeed.rpc'
        );

        if (error) throw error;
        mapped = mapFeedRows(data || []);
      } catch (rpcError) {
        console.error('Error fetching feed from RPC, falling back to direct query:', rpcError);
        mapped = await fetchActivityFeedDirect(user.id, filter, page, limit, targetActorId);
      }
    }

    const hydrated = await hydrateCurrentUserReactions(mapped);
    const hiddenActivityIds = await getMyReportedTargetIds(
      'activity',
      hydrated.map((activity) => activity.id)
    );
    if (hiddenActivityIds.size === 0) return hydrated;
    return hydrated.filter((activity) => !hiddenActivityIds.has(activity.id));
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return [];
  }
}

/**
 * Publish clothing item snapshot to timeline.
 */
export async function publishItemToTimeline(
  item: ClothingItem,
  options: PublishItemOptions = {}
): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Not authenticated');

  const visibility = normalizeVisibility(options.visibility);
  const snapshot = serializeClothingSnapshot(item);

  const payload = {
    visibility,
    caption: options.caption || '',
    tags: options.tags || [],
    clothing_item: snapshot,
    likes_count: 0,
    comments_count: 0,
    shares_count: 0,
  };

  const { error } = await (supabase.from('activity_feed') as any)
    .insert({
      user_id: user.id,
      actor_id: user.id,
      activity_type: 'item_added',
      target_type: 'clothing_item',
      target_id: toUuidOrRandom(item.id),
      metadata: payload,
    });

  if (error) throw error;
  analytics.trackEvent('timeline_item_published', { visibility });
}

/**
 * Publish outfit snapshot bundle to timeline.
 */
export async function publishOutfitToTimeline(
  outfit: SavedOutfit,
  outfitBundle: OutfitBundle,
  options: PublishOutfitOptions = {}
): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Not authenticated');

  const visibility = normalizeVisibility(options.visibility);
  const payload = {
    visibility,
    caption: options.caption || '',
    tags: options.tags || [],
    look_name: outfit.name || 'Look compartido',
    share_token: outfit.share_token || null,
    cover_image_url: outfit.cover_image_url || outfitBundle.top?.imageDataUrl || outfitBundle.bottom?.imageDataUrl || outfitBundle.shoes?.imageDataUrl || null,
    reference_summary: outfit.reference_summary || null,
    outfit: {
      id: outfit.id,
      top_id: outfit.top_id,
      bottom_id: outfit.bottom_id,
      shoes_id: outfit.shoes_id,
      explanation: outfit.explanation,
      name: outfit.name || null,
      share_token: outfit.share_token || null,
    },
    outfit_bundle: {
      top: outfitBundle.top ? serializeClothingSnapshot(outfitBundle.top) : null,
      bottom: outfitBundle.bottom ? serializeClothingSnapshot(outfitBundle.bottom) : null,
      shoes: outfitBundle.shoes ? serializeClothingSnapshot(outfitBundle.shoes) : null,
    },
    likes_count: 0,
    comments_count: 0,
    shares_count: 0,
  };

  const { error } = await (supabase.from('activity_feed') as any)
    .insert({
      user_id: user.id,
      actor_id: user.id,
      activity_type: 'outfit_shared',
      target_type: 'outfit',
      target_id: toUuidOrRandom(outfit.id),
      metadata: payload,
    });

  if (error) throw error;
  analytics.trackEvent('look_shared', { visibility, source: 'look_library' });
  analytics.trackEvent('timeline_outfit_published', { visibility });
}

/**
 * Publish a generic social post (photo + caption).
 */
export async function publishSocialPostToTimeline(
  options: PublishSocialPostOptions = {}
): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Not authenticated');

  const caption = (options.caption || '').trim();
  const visibility = normalizeVisibility(options.visibility);
  const hasImage = Boolean(options.imageDataUrl);

  if (!caption && !hasImage) {
    throw new Error('Escribí algo o subí una foto para publicar');
  }

  if (hasImage) {
    let imageUrl = options.imageDataUrl as string;
    if (imageUrl.startsWith('data:image')) {
      const file = dataUrlToFile(imageUrl, `social-post-${Date.now()}.jpg`);
      const path = `${user.id}/social-posts/${Date.now()}-${crypto.randomUUID()}.jpg`;
      imageUrl = await uploadImage('outfit-shares', path, file);
    }

    const clothingSnapshot: ClothingItem = {
      id: `post-item-${crypto.randomUUID()}`,
      imageDataUrl: imageUrl,
      metadata: {
        category: 'top',
        subcategory: caption || 'Publicación',
        color_primary: 'desconocido',
        vibe_tags: ['social'],
        seasons: [],
        description: caption || 'Publicación social',
      },
      status: 'wishlist',
      linkMode: 'linked',
      sourceRef: {
        originType: 'social_post',
        originUrl: imageUrl,
      },
    };

    const { error } = await (supabase.from('activity_feed') as any)
      .insert({
        user_id: user.id,
        actor_id: user.id,
        activity_type: 'item_added',
        target_type: 'social_post',
        target_id: crypto.randomUUID(),
        metadata: {
          visibility,
          caption,
          tags: ['social'],
          clothing_item: clothingSnapshot,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
          post_kind: 'photo',
        },
      });

    if (error) throw error;
    analytics.trackEvent('social_post_published', { visibility, post_kind: 'photo' });
    return;
  }

  const { error } = await (supabase.from('activity_feed') as any)
    .insert({
      user_id: user.id,
      actor_id: user.id,
      activity_type: 'style_milestone',
      target_type: 'social_post',
      target_id: crypto.randomUUID(),
      metadata: {
        visibility,
        caption,
        tags: ['social'],
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        post_kind: 'text',
      },
    });

  if (error) throw error;
  analytics.trackEvent('social_post_published', { visibility, post_kind: 'text' });
}

/**
 * Import activity snapshots to closet as wishlist (save/wish mode).
 */
export async function importFromActivity(
  activity: ActivityFeedItem,
  mode: ImportMode = 'save'
): Promise<ImportFromActivityResult> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Not authenticated');

  const makeFavorite = mode === 'wish';
  const importedItems: ClothingItem[] = [];
  const missingSlots: string[] = [];
  const linkMode = getFeatureFlag('enableLinkedSourceItems') ? 'linked' : 'copy';

  const importSnapshot = async (snapshot: ClothingItem, slot?: 'top' | 'bottom' | 'shoes') => {
    const slotSuffix = slot ? `:${slot}` : '';
    const dedupeKey = `${activity.id}:${snapshot.id || 'snapshot'}:${user.id}${slotSuffix}`;
    const imported = await closetService.addImportedClothingItem({
      imageSource: snapshot.imageDataUrl,
      metadata: snapshot.metadata,
      status: 'wishlist',
      isFavorite: makeFavorite,
      linkMode,
      sourceRef: {
        originType: slot ? 'activity_outfit' : 'activity_item',
        originActivityId: activity.id,
        originUserId: activity.user_id,
        originItemId: snapshot.id,
        originOutfitId: activity.outfit?.id,
        originUrl: snapshot.imageDataUrl,
        dedupeKey,
      },
    });
    importedItems.push(imported);
  };

  if (activity.activity_type === 'item_added') {
    const rawSnapshot = activity.clothing_item || (activity.metadata_payload?.clothing_item as ClothingItem | undefined);
    const snapshot = normalizeSnapshotForImport(rawSnapshot);
    if (!hasImportableSnapshot(snapshot)) {
      throw new Error('No disponible para guardar');
    }
    await importSnapshot(snapshot);
  } else if (activity.activity_type === 'outfit_shared') {
    const bundle = extractOutfitBundle(activity);
    const slots: Array<keyof OutfitBundle> = ['top', 'bottom', 'shoes'];

    for (const slot of slots) {
      const snapshot = normalizeSnapshotForImport(bundle[slot]);
      if (!hasImportableSnapshot(snapshot)) {
        missingSlots.push(slot);
        continue;
      }
      await importSnapshot(snapshot, slot);
    }
  } else {
    throw new Error('Actividad no soportada para importar');
  }

  let importedOutfit: SavedOutfit | null = null;
  if (
    activity.activity_type === 'outfit_shared' &&
    importedItems.length === 3 &&
    getFeatureFlag('useSupabaseOutfits')
  ) {
    importedOutfit = await outfitService.saveOutfit({
      top_id: importedItems[0].id,
      bottom_id: importedItems[1].id,
      shoes_id: importedItems[2].id,
      explanation: activity.outfit?.explanation || activity.caption || 'Outfit importado desde actividad',
    });
  }

  analytics.trackEvent(mode === 'wish' ? 'activity_wished' : 'activity_saved_to_closet', {
    activity_type: activity.activity_type,
    imported_count: importedItems.length,
  });

  return {
    importedItems,
    importedOutfit,
    missingSlots: missingSlots.length > 0 ? missingSlots : undefined,
  };
}

export async function toggleActivityReaction(
  activityId: string,
  reactionType: 'like' | 'share'
): Promise<ToggleReactionResult> {
  try {
    const { data, error } = await supabase.rpc('toggle_activity_reaction', {
      p_activity_id: activityId,
      p_reaction_type: reactionType,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      throw new Error('Empty reaction response');
    }

    analytics.trackEvent('social_reaction_toggled', {
      reaction_type: reactionType,
      is_active: Boolean(row.is_active),
      activity_id: activityId,
    });

    return {
      isActive: Boolean(row.is_active),
      likesCount: Number(row.likes_count || 0),
      sharesCount: Number(row.shares_count || 0),
    };
  } catch (error) {
    console.error('Failed to toggle activity reaction via RPC:', error);

    // Fallback path using direct table operations.
    const user = await getAuthenticatedUser();
    if (!user) {
      throw new Error('No autenticado');
    }

    const { data: existing } = await supabase
      .from('activity_reactions')
      .select('id')
      .eq('activity_id', activityId)
      .eq('user_id', user.id)
      .eq('reaction_type', reactionType)
      .maybeSingle();

    let isActive = false;
    if (existing?.id) {
      const { error: deleteError } = await supabase
        .from('activity_reactions')
        .delete()
        .eq('id', existing.id);
      if (deleteError) throw deleteError;
      isActive = false;
    } else {
      const { error: insertError } = await supabase
        .from('activity_reactions')
        .insert({
          activity_id: activityId,
          user_id: user.id,
          reaction_type: reactionType,
        });
      if (insertError) throw insertError;
      isActive = true;
    }

    const { data: countsData } = await supabase
      .from('activity_reactions')
      .select('reaction_type')
      .eq('activity_id', activityId);

    const likesCount = (countsData || []).filter((row) => row.reaction_type === 'like').length;
    const sharesCount = (countsData || []).filter((row) => row.reaction_type === 'share').length;

    return {
      isActive,
      likesCount,
      sharesCount,
    };
  }
}

export async function createActivityComment(
  activityId: string,
  content: string,
  parentCommentId?: string | null
): Promise<ActivityComment> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Escribí un comentario');
  }

  try {
    const { data, error } = await supabase.rpc('create_activity_comment', {
      p_activity_id: activityId,
      p_parent_comment_id: parentCommentId || null,
      p_content: trimmed,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('No se pudo crear comentario');

    analytics.trackEvent(parentCommentId ? 'social_comment_replied' : 'social_comment_created', {
      activity_id: activityId,
    });

    return {
      id: row.id,
      activity_id: row.activity_id,
      user_id: row.user_id,
      user_name: row.user_name || 'Usuario',
      user_avatar: row.user_avatar || '👤',
      content: row.content,
      parent_comment_id: row.parent_comment_id,
      replies_count: Number(row.replies_count || 0),
      is_deleted: Boolean(row.deleted_at),
      timestamp: row.created_at,
      likes_count: 0,
      is_liked: false,
    };
  } catch (error) {
    console.error('Failed to create activity comment via RPC:', error);

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Not authenticated');

    const { data: inserted, error: insertError } = await supabase
      .from('activity_comments')
      .insert({
        activity_id: activityId,
        user_id: user.id,
        parent_comment_id: parentCommentId || null,
        content: trimmed,
      })
      .select('id, activity_id, user_id, content, parent_comment_id, created_at')
      .single();

    if (insertError || !inserted) {
      throw insertError || new Error('No se pudo crear comentario');
    }

    return {
      id: inserted.id,
      activity_id: inserted.activity_id,
      user_id: inserted.user_id,
      user_name: 'Tú',
      user_avatar: '👤',
      content: inserted.content,
      parent_comment_id: inserted.parent_comment_id,
      replies_count: 0,
      timestamp: inserted.created_at,
      likes_count: 0,
      is_liked: false,
    };
  }
}

export async function toggleActivityCommentLike(
  commentId: string
): Promise<ToggleCommentLikeResult> {
  try {
    const { data, error } = await supabase.rpc('toggle_activity_comment_like', {
      p_comment_id: commentId,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Empty comment like response');

    return {
      isActive: Boolean(row.is_active),
      likesCount: Number(row.likes_count || 0),
    };
  } catch (error) {
    console.error('Failed to toggle comment like via RPC:', error);

    const user = await getAuthenticatedUser();
    if (!user) throw new Error('No autenticado');

    const { data: existing } = await supabase
      .from('activity_comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    let isActive = false;
    if (existing?.id) {
      const { error: deleteError } = await supabase
        .from('activity_comment_likes')
        .delete()
        .eq('id', existing.id);
      if (deleteError) throw deleteError;
      isActive = false;
    } else {
      const { error: insertError } = await supabase
        .from('activity_comment_likes')
        .insert({
          comment_id: commentId,
          user_id: user.id,
        });
      if (insertError) throw insertError;
      isActive = true;
    }

    const { count } = await supabase
      .from('activity_comment_likes')
      .select('id', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    return {
      isActive,
      likesCount: Number(count || 0),
    };
  }
}

export async function deleteActivityComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('activity_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Failed to delete activity comment:', error);
    throw new Error('No se pudo borrar el comentario');
  }

  analytics.trackEvent('social_comment_deleted', { comment_id: commentId });
}

/**
 * Returns the appropriate Material Symbols icon for an activity type.
 */
export function getActivityIcon(activityType: ActivityType): string {
  const normalizedType = normalizeActivityType(activityType);
  const iconMap: Record<ActivityType, string> = {
    outfit_shared: 'checkroom',
    item_added: 'add_shopping_cart',
    challenge_completed: 'emoji_events',
    outfit_saved: 'favorite',
    capsule_created: 'inventory_2',
    style_milestone: 'stars',
    lookbook_created: 'photo_library',
    rating_given: 'star',
    borrow_request: 'swap_horiz',
    borrow_approved: 'check_circle',
    borrow_declined: 'cancel',
    item_returned: 'assignment_return',
    like: 'favorite',
    comment: 'chat_bubble',
    follow: 'person_add',
  };

  return iconMap[normalizedType] || 'notifications';
}

/**
 * Generates a human-readable description for an activity.
 */
export function getActivityDescription(activity: ActivityFeedItem): string {
  const normalizedType = normalizeActivityType(activity.activity_type);
  const descriptionMap: Record<ActivityType, string> = {
    outfit_shared: 'compartió un outfit',
    item_added: 'agregó una prenda nueva',
    challenge_completed: 'completó un desafío',
    outfit_saved: 'guardó un outfit favorito',
    capsule_created: 'creó una cápsula de armario',
    style_milestone: 'alcanzó un hito de estilo',
    lookbook_created: 'creó un lookbook',
    rating_given: 'calificó un outfit',
    borrow_request: 'te pidió prestada una prenda',
    borrow_approved: 'aprobó tu solicitud de préstamo',
    borrow_declined: 'rechazó tu solicitud de préstamo',
    item_returned: 'devolvió una prenda prestada',
    like: 'le gustó una publicación',
    comment: 'comentó una publicación',
    follow: 'empezó a seguirte',
  };

  return descriptionMap[normalizedType] || 'realizó una actividad';
}

/**
 * Formats a timestamp into relative time.
 */
export function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);

  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7) return `hace ${days}d`;
  if (weeks < 4) return `hace ${weeks}sem`;

  return new Date(timestamp).toLocaleDateString('es-AR', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats engagement count with K/M suffixes.
 */
export function formatEngagementCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}

/**
 * Toggles like status on an activity in local state.
 */
export function toggleActivityLike(
  activityId: string,
  activities: ActivityFeedItem[],
  server?: ToggleReactionResult
): ActivityFeedItem[] {
  return activities.map((activity) => {
    if (activity.id !== activityId) return activity;

    if (server) {
      return {
        ...activity,
        is_liked: server.isActive,
        is_shared: activity.is_shared,
        isLikedByMe: server.isActive,
        likes_count: server.likesCount,
        shares_count: server.sharesCount,
      };
    }

    const nextLiked = !activity.is_liked;
    return {
      ...activity,
      is_liked: nextLiked,
      isLikedByMe: nextLiked,
      likes_count: nextLiked
        ? activity.likes_count + 1
        : Math.max(0, activity.likes_count - 1),
    };
  });
}

/**
 * Toggles share status on an activity in local state.
 */
export function toggleActivityShare(
  activityId: string,
  activities: ActivityFeedItem[],
  server?: ToggleReactionResult
): ActivityFeedItem[] {
  return activities.map((activity) => {
    if (activity.id !== activityId) return activity;

    if (server) {
      return {
        ...activity,
        is_shared: server.isActive,
        isSharedByMe: server.isActive,
        likes_count: server.likesCount,
        shares_count: server.sharesCount,
      };
    }

    const nextShared = !activity.is_shared;
    return {
      ...activity,
      is_shared: nextShared,
      isSharedByMe: nextShared,
      shares_count: nextShared
        ? activity.shares_count + 1
        : Math.max(0, activity.shares_count - 1),
    };
  });
}

/**
 * Adds a comment and updates local activity count.
 */
export async function addActivityComment(
  activityId: string,
  content: string,
  activities: ActivityFeedItem[],
  parentCommentId?: string | null
): Promise<{
  updatedActivities: ActivityFeedItem[];
  newComment: ActivityComment;
}> {
  const newComment = await createActivityComment(activityId, content, parentCommentId);

  const updatedActivities = activities.map((activity) => {
    if (activity.id !== activityId) return activity;

    return {
      ...activity,
      comments_count: activity.comments_count + 1,
    };
  });

  return { updatedActivities, newComment };
}

/**
 * Fetches comments for an activity from Supabase.
 */
export async function fetchActivityComments(activityId: string): Promise<ActivityComment[]> {
  try {
    const { data, error } = await supabase.rpc('get_activity_comments', {
      p_activity_id: activityId,
    });

    if (error) throw error;

    const mapped = (data || []).map((comment: any) => ({
      id: comment.id,
      activity_id: comment.activity_id,
      user_id: comment.user_id,
      user_name: comment.user_name || 'Usuario',
      user_avatar: comment.user_avatar || '👤',
      content: comment.content,
      parent_comment_id: comment.parent_comment_id,
      replies_count: Number(comment.replies_count || 0),
      is_deleted: Boolean(comment.deleted_at),
      timestamp: comment.created_at,
      likes_count: Number(comment.likes_count || 0),
      is_liked: Boolean(comment.is_liked),
    }));

    const hiddenCommentIds = await getMyReportedTargetIds(
      'comment',
      mapped.map((comment) => comment.id)
    );
    const filtered = hiddenCommentIds.size === 0
      ? mapped
      : mapped.filter(
      (comment) => !hiddenCommentIds.has(comment.id) && !hiddenCommentIds.has(comment.parent_comment_id || '')
    );
    return await hydrateCommentLikes(filtered);
  } catch (error) {
    console.error('Error fetching comments via RPC:', error);

    // Fallback direct read.
    const { data, error: fallbackError } = await supabase
      .from('activity_comments')
      .select('id, activity_id, user_id, parent_comment_id, content, created_at, deleted_at')
      .eq('activity_id', activityId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (fallbackError) {
      console.error('Error fetching comments fallback:', fallbackError);
      return [];
    }

    const mapped = (data || []).map((comment) => ({
      id: comment.id,
      activity_id: comment.activity_id,
      user_id: comment.user_id,
      user_name: 'Usuario',
      user_avatar: '👤',
      content: comment.content,
      parent_comment_id: comment.parent_comment_id,
      is_deleted: Boolean(comment.deleted_at),
      timestamp: comment.created_at,
      likes_count: 0,
      is_liked: false,
    }));

    const hiddenCommentIds = await getMyReportedTargetIds(
      'comment',
      mapped.map((comment) => comment.id)
    );
    const filtered = hiddenCommentIds.size === 0
      ? mapped
      : mapped.filter(
      (comment) => !hiddenCommentIds.has(comment.id) && !hiddenCommentIds.has(comment.parent_comment_id || '')
    );
    return await hydrateCommentLikes(filtered);
  }
}

/**
 * Filters activities by type.
 */
export function filterActivitiesByType(
  activities: ActivityFeedItem[],
  filterTypes: Array<ActivityType | 'all'>
): ActivityFeedItem[] {
  if (filterTypes.includes('all')) {
    return activities;
  }

  const selectedTypes = filterTypes as ActivityType[];
  return activities.filter((activity) => selectedTypes.includes(activity.activity_type));
}
