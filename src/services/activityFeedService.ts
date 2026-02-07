/**
 * Activity Feed Service
 *
 * Provides utility functions for the Friend Activity Feed feature.
 * All data is fetched from Supabase backend - no mock data.
 */

import type {
  ActivityFeedItem,
  ActivityComment,
  ActivityType
} from '../../types';

import { supabase } from '../lib/supabase';

/**
 * Fetches the activity feed from Supabase
 */
export async function fetchActivityFeed(
  filter: 'all' | 'close_friends' | 'community' = 'all',
  page: number = 0,
  limit: number = 20,
  targetActorId?: string
): Promise<ActivityFeedItem[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    // Use the RPC function we created for optimized fetching
    const { data, error } = await supabase.rpc('get_user_feed', {
      p_user_id: user.id,
      p_filter_type: filter,
      p_limit: limit,
      p_offset: page * limit,
      p_target_actor_id: targetActorId || null
    });

    if (error) {
      console.error('Error fetching feed from RPC:', error);
      return [];
    }

    // Map the raw DB result to ActivityFeedItem
    return (data || []).map((item: any) => ({
      id: item.id,
      user_id: item.actor_id,
      user_name: item.actor_display_name || item.actor_username || 'Usuario',
      user_avatar: item.actor_avatar,
      activity_type: item.activity_type as ActivityType,
      timestamp: item.created_at,
      caption: item.metadata?.caption,
      tags: item.metadata?.tags,
      likes_count: item.metadata?.likes_count || 0,
      comments_count: item.metadata?.comments_count || 0,
      shares_count: item.metadata?.shares_count || 0,
      is_liked: false,
      is_shared: false,
      outfit: item.metadata?.outfit,
      clothing_item: item.metadata?.clothing_item,
      challenge: item.metadata?.challenge,
      capsule: item.metadata?.capsule,
      lookbook: item.metadata?.lookbook,
      outfit_rating: item.metadata?.outfit_rating
    }));
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return [];
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Returns the appropriate Material Symbols icon for an activity type
 */
export function getActivityIcon(activityType: ActivityType): string {
  const iconMap: Record<ActivityType, string> = {
    outfit_shared: 'checkroom',
    item_added: 'add_shopping_cart',
    challenge_completed: 'emoji_events',
    outfit_saved: 'favorite',
    capsule_created: 'inventory_2',
    style_milestone: 'stars',
    lookbook_created: 'photo_library',
    rating_given: 'star',
    borrow_requested: 'swap_horiz',
    borrow_approved: 'check_circle',
    borrow_declined: 'cancel',
    item_returned: 'assignment_return'
  };

  return iconMap[activityType] || 'notifications';
}

/**
 * Generates a human-readable description for an activity
 */
export function getActivityDescription(activity: ActivityFeedItem): string {
  const descriptionMap: Record<ActivityType, string> = {
    outfit_shared: 'compartió un outfit',
    item_added: 'agregó una prenda nueva',
    challenge_completed: 'completó un desafío',
    outfit_saved: 'guardó un outfit favorito',
    capsule_created: 'creó una cápsula de armario',
    style_milestone: 'alcanzó un hito de estilo',
    lookbook_created: 'creó un lookbook',
    rating_given: 'calificó un outfit',
    borrow_requested: 'te pidió prestada una prenda',
    borrow_approved: 'aprobó tu solicitud de préstamo',
    borrow_declined: 'rechazó tu solicitud de préstamo',
    item_returned: 'devolvió una prenda prestada'
  };

  return descriptionMap[activity.activity_type] || 'realizó una actividad';
}

/**
 * Formats a timestamp into relative time (e.g., "hace 2h", "hace 3d")
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
    day: 'numeric'
  });
}

/**
 * Formats engagement count with K/M suffixes
 */
export function formatEngagementCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}

// ===== INTERACTION FUNCTIONS =====

/**
 * Toggles like status on an activity (local state update)
 */
export function toggleActivityLike(
  activityId: string,
  activities: ActivityFeedItem[]
): ActivityFeedItem[] {
  return activities.map(activity => {
    if (activity.id === activityId) {
      return {
        ...activity,
        is_liked: !activity.is_liked,
        likes_count: activity.is_liked
          ? activity.likes_count - 1
          : activity.likes_count + 1
      };
    }
    return activity;
  });
}

/**
 * Toggles share status on an activity (local state update)
 */
export function toggleActivityShare(
  activityId: string,
  activities: ActivityFeedItem[]
): ActivityFeedItem[] {
  return activities.map(activity => {
    if (activity.id === activityId) {
      return {
        ...activity,
        is_shared: !activity.is_shared,
        shares_count: activity.is_shared
          ? activity.shares_count - 1
          : activity.shares_count + 1
      };
    }
    return activity;
  });
}

/**
 * Adds a comment to an activity (local state update)
 */
export async function addActivityComment(
  activityId: string,
  content: string,
  activities: ActivityFeedItem[]
): Promise<{
  updatedActivities: ActivityFeedItem[],
  newComment: ActivityComment
}> {
  const { data: { user } } = await supabase.auth.getUser();

  const newComment: ActivityComment = {
    id: `comment-${Date.now()}`,
    activity_id: activityId,
    user_id: user?.id || 'current-user',
    user_name: 'Tú',
    user_avatar: '👤',
    content,
    timestamp: new Date().toISOString(),
    likes_count: 0
  };

  const updatedActivities = activities.map(activity => {
    if (activity.id === activityId) {
      return {
        ...activity,
        comments_count: activity.comments_count + 1
      };
    }
    return activity;
  });

  return { updatedActivities, newComment };
}

/**
 * Fetches comments for an activity from Supabase
 */
export async function fetchActivityComments(activityId: string): Promise<ActivityComment[]> {
  try {
    // For now, return empty array - comments feature to be implemented
    // This prevents showing mock data
    return [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

/**
 * Filters activities by type
 */
export function filterActivitiesByType(
  activities: ActivityFeedItem[],
  filterTypes: Array<ActivityType | 'all'>
): ActivityFeedItem[] {
  if (filterTypes.includes('all')) {
    return activities;
  }

  const selectedTypes = filterTypes as ActivityType[];
  return activities.filter(activity =>
    selectedTypes.includes(activity.activity_type)
  );
}
