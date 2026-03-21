import { supabase } from '../lib/supabase';
import { getSafePublicDisplayName } from '../utils/publicProfile';

export interface SuggestedUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  similarity_score: number;
  common_preferences: string[];
  mutual_follows?: number;
  recent_activity_score?: number;
}

function sanitizeSuggestedUser<T extends SuggestedUser>(profile: T): T {
  return {
    ...profile,
    display_name: getSafePublicDisplayName(profile.display_name, profile.username),
  };
}

export interface SocialProfilePreview {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

export interface ProfileSocialSummary {
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_followed_by: boolean;
}

const DEFAULT_SOCIAL_SUMMARY: ProfileSocialSummary = {
  followers_count: 0,
  following_count: 0,
  is_following: false,
  is_followed_by: false,
};

/**
 * Fetches suggested users based on style compatibility + social graph.
 */
export async function fetchSuggestedUsers(limit: number = 5): Promise<SuggestedUser[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return [];

    const { data, error } = await supabase.rpc('get_suggested_users', {
      p_user_id: user.id,
      p_limit: limit,
    });

    if (error) {
      // Graceful fallback for environments without latest SQL functions.
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .neq('id', user.id)
        .eq('is_public', true)
        .limit(limit);

      if (fallbackError) throw fallbackError;

      return (fallbackData || []).map((profile) => sanitizeSuggestedUser({
        id: profile.id,
        username: profile.username || 'user',
        display_name: profile.display_name || profile.username || 'Usuario',
        avatar_url: profile.avatar_url || '',
        similarity_score: 0,
        common_preferences: [],
        mutual_follows: 0,
        recent_activity_score: 0,
      }));
    }

    return ((data || []) as SuggestedUser[]).map((profile) => sanitizeSuggestedUser(profile));
  } catch (error) {
    console.error('Error fetching suggested users:', error);
    return [];
  }
}

/**
 * Follows a user using the asymmetric followers graph.
 */
export async function followUser(targetUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    const { error } = await supabase.rpc('follow_user', {
      p_target_user_id: targetUserId,
    });
    if (error) throw error;
  } catch (error) {
    // Backward-compatible fallback for environments without RPC.
    const { error: fallbackError } = await supabase
      .from('user_follows')
      .upsert({
        follower_id: user.id,
        followee_id: targetUserId,
        status: 'active',
      }, {
        onConflict: 'follower_id,followee_id',
      });

    if (fallbackError) throw (error || fallbackError);
  }
}

/**
 * Unfollows a user.
 */
export async function unfollowUser(targetUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    const { error } = await supabase.rpc('unfollow_user', {
      p_target_user_id: targetUserId,
    });
    if (error) throw error;
  } catch (error) {
    const { error: fallbackError } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followee_id', targetUserId);

    if (fallbackError) throw (error || fallbackError);
  }
}

/**
 * Gets social counters and relationship state for a profile.
 */
export async function getProfileSocialSummary(
  profileId: string,
  currentUserId?: string | null
): Promise<ProfileSocialSummary> {
  if (!profileId) return DEFAULT_SOCIAL_SUMMARY;
  let viewerId = currentUserId || null;
  if (!viewerId) {
    const { data: { user } } = await supabase.auth.getUser();
    viewerId = user?.id || null;
  }
  if (!viewerId) return DEFAULT_SOCIAL_SUMMARY;

  try {
    const { data, error } = await supabase.rpc('get_profile_social_summary', {
      p_profile_id: profileId,
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      return DEFAULT_SOCIAL_SUMMARY;
    }

    const summary = data[0] as ProfileSocialSummary;
    return {
      followers_count: Number(summary.followers_count || 0),
      following_count: Number(summary.following_count || 0),
      is_following: Boolean(summary.is_following),
      is_followed_by: Boolean(summary.is_followed_by),
    };
  } catch (error) {
    // Fallback using direct queries.
    const [{ count: followers }, { count: following }, { data: relation }] = await Promise.all([
      supabase
        .from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('followee_id', profileId)
        .eq('status', 'active'),
      supabase
        .from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', profileId)
        .eq('status', 'active'),
      supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', viewerId)
        .eq('followee_id', profileId)
        .eq('status', 'active')
        .maybeSingle(),
    ]);

    const { data: backRelation } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', profileId)
      .eq('followee_id', viewerId)
      .eq('status', 'active')
      .maybeSingle();

    return {
      followers_count: followers || 0,
      following_count: following || 0,
      is_following: Boolean(relation),
      is_followed_by: Boolean(backRelation),
    };
  }
}

export async function getFollowers(profileId: string, limit: number = 50): Promise<SocialProfilePreview[]> {
  if (!profileId) return [];
  try {
    const { data, error } = await supabase.rpc('get_profile_followers', {
      p_profile_id: profileId,
      p_limit: limit,
      p_offset: 0,
    });

    if (error) throw error;
    if (!data) return [];

    return (data as any[]).map((profile) => ({
      id: profile.id,
      username: profile.username || 'user',
      display_name: profile.display_name || profile.username || 'Usuario',
      avatar_url: profile.avatar_url || '',
    }));
  } catch (_error) {
    const { data, error } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('followee_id', profileId)
      .eq('status', 'active')
      .limit(limit);

    if (error || !data) return [];
    const ids = data.map((row: any) => row.follower_id).filter(Boolean);
    if (ids.length === 0) return [];

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', ids);

    if (profilesError || !profiles) return [];
    return profiles.map((profile: any) => ({
      id: profile.id,
      username: profile.username || 'user',
      display_name: profile.display_name || profile.username || 'Usuario',
      avatar_url: profile.avatar_url || '',
    }));
  }
}

export async function getFollowing(profileId: string, limit: number = 50): Promise<SocialProfilePreview[]> {
  if (!profileId) return [];
  try {
    const { data, error } = await supabase.rpc('get_profile_following', {
      p_profile_id: profileId,
      p_limit: limit,
      p_offset: 0,
    });

    if (error) throw error;
    if (!data) return [];

    return (data as any[]).map((profile) => ({
      id: profile.id,
      username: profile.username || 'user',
      display_name: profile.display_name || profile.username || 'Usuario',
      avatar_url: profile.avatar_url || '',
    }));
  } catch (_error) {
    const { data, error } = await supabase
      .from('user_follows')
      .select('followee_id')
      .eq('follower_id', profileId)
      .eq('status', 'active')
      .limit(limit);

    if (error || !data) return [];
    const ids = data.map((row: any) => row.followee_id).filter(Boolean);
    if (ids.length === 0) return [];

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', ids);

    if (profilesError || !profiles) return [];
    return profiles.map((profile: any) => ({
      id: profile.id,
      username: profile.username || 'user',
      display_name: profile.display_name || profile.username || 'Usuario',
      avatar_url: profile.avatar_url || '',
    }));
  }
}

/**
 * Checks if a user is a close friend.
 * Legacy helper used in profile overlays.
 */
export async function isCloseFriend(friendId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('close_friends')
    .select('id')
    .eq('user_id', user.id)
    .eq('friend_id', friendId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking close friend status:', error);
    return false;
  }

  return !!data;
}

/**
 * Toggles close friend status.
 * Legacy helper kept for friendship-based experiences.
 */
export async function toggleCloseFriend(friendId: string, isClose: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  if (isClose) {
    const { error } = await supabase
      .from('close_friends')
      .insert({
        user_id: user.id,
        friend_id: friendId,
      });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('close_friends')
    .delete()
    .match({
      user_id: user.id,
      friend_id: friendId,
    });

  if (error) throw error;
}
