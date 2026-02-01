/**
 * Friendship Service
 *
 * Handles all friendship-related operations with Supabase:
 * - Send/accept/reject friend requests
 * - List friends and pending requests
 * - Search users to add as friends
 * - Manage close friends
 */

import { supabase } from '../src/lib/supabase';

export interface FriendProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
}

export interface FriendshipStatus {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface FriendWithProfile extends FriendshipStatus {
  friend: FriendProfile;
  is_close_friend: boolean;
}

export interface PendingRequest {
  id: string;
  requester: FriendProfile;
  created_at: string;
}

// ===== FRIEND REQUESTS =====

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(addresseeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    if (user.id === addresseeId) {
      return { success: false, error: 'No puedes agregarte a ti mismo' };
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        return { success: false, error: 'Ya son amigos' };
      }
      if (existing.status === 'pending') {
        return { success: false, error: 'Ya hay una solicitud pendiente' };
      }
      if (existing.status === 'blocked') {
        return { success: false, error: 'No se puede enviar solicitud' };
      }
    }

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'pending'
      });

    if (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: 'Error al enviar solicitud' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in sendFriendRequest:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Accept a pending friend request
 */
export async function acceptFriendRequest(friendshipId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendshipId)
      .eq('addressee_id', user.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Error accepting friend request:', error);
      return { success: false, error: 'Error al aceptar solicitud' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in acceptFriendRequest:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Decline a pending friend request
 */
export async function declineFriendRequest(friendshipId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', friendshipId)
      .eq('addressee_id', user.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Error declining friend request:', error);
      return { success: false, error: 'Error al rechazar solicitud' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in declineFriendRequest:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Remove a friend (delete the friendship)
 */
export async function removeFriend(friendshipId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) {
      console.error('Error removing friend:', error);
      return { success: false, error: 'Error al eliminar amigo' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in removeFriend:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

// ===== LISTING FRIENDS =====

/**
 * Get all accepted friends for the current user
 */
export async function getFriends(): Promise<FriendWithProfile[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get all accepted friendships where user is requester or addressee
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at,
        updated_at
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error || !friendships) {
      console.error('Error fetching friendships:', error);
      return [];
    }

    // Get the friend IDs (the other person in each friendship)
    const friendIds = friendships.map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    if (friendIds.length === 0) return [];

    // Fetch profiles for all friends
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, is_public')
      .in('id', friendIds);

    if (profilesError || !profiles) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }

    // Get close friends list
    const { data: closeFriends } = await supabase
      .from('close_friends')
      .select('friend_id')
      .eq('user_id', user.id);

    const closeFriendIds = new Set((closeFriends || []).map(cf => cf.friend_id));

    // Combine friendships with profiles
    return friendships.map(f => {
      const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      const profile = profiles.find(p => p.id === friendId);

      return {
        ...f,
        friend: profile || {
          id: friendId,
          username: 'Usuario',
          display_name: null,
          avatar_url: null,
          bio: null,
          is_public: false
        },
        is_close_friend: closeFriendIds.has(friendId)
      };
    });
  } catch (error) {
    console.error('Error in getFriends:', error);
    return [];
  }
}

/**
 * Get pending friend requests received by the current user
 */
export async function getPendingRequests(): Promise<PendingRequest[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: requests, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        created_at
      `)
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !requests) {
      console.error('Error fetching pending requests:', error);
      return [];
    }

    if (requests.length === 0) return [];

    // Fetch profiles for all requesters
    const requesterIds = requests.map(r => r.requester_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, is_public')
      .in('id', requesterIds);

    if (profilesError || !profiles) {
      console.error('Error fetching requester profiles:', profilesError);
      return [];
    }

    return requests.map(r => ({
      id: r.id,
      requester: profiles.find(p => p.id === r.requester_id) || {
        id: r.requester_id,
        username: 'Usuario',
        display_name: null,
        avatar_url: null,
        bio: null,
        is_public: false
      },
      created_at: r.created_at
    }));
  } catch (error) {
    console.error('Error in getPendingRequests:', error);
    return [];
  }
}

/**
 * Get pending friend requests sent by the current user
 */
export async function getSentRequests(): Promise<PendingRequest[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: requests, error } = await supabase
      .from('friendships')
      .select(`
        id,
        addressee_id,
        created_at
      `)
      .eq('requester_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !requests) {
      console.error('Error fetching sent requests:', error);
      return [];
    }

    if (requests.length === 0) return [];

    // Fetch profiles for all addressees
    const addresseeIds = requests.map(r => r.addressee_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, is_public')
      .in('id', addresseeIds);

    if (profilesError || !profiles) {
      console.error('Error fetching addressee profiles:', profilesError);
      return [];
    }

    return requests.map(r => ({
      id: r.id,
      requester: profiles.find(p => p.id === r.addressee_id) || {
        id: r.addressee_id,
        username: 'Usuario',
        display_name: null,
        avatar_url: null,
        bio: null,
        is_public: false
      },
      created_at: r.created_at
    }));
  } catch (error) {
    console.error('Error in getSentRequests:', error);
    return [];
  }
}

// ===== USER SEARCH =====

/**
 * Search for users by username or display name
 */
export async function searchUsers(query: string): Promise<FriendProfile[]> {
  try {
    if (!query || query.length < 2) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, is_public')
      .neq('id', user.id)
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return profiles || [];
  } catch (error) {
    console.error('Error in searchUsers:', error);
    return [];
  }
}

/**
 * Get friendship status with a specific user
 */
export async function getFriendshipStatus(otherUserId: string): Promise<FriendshipStatus | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${user.id})`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - no friendship exists
        return null;
      }
      console.error('Error getting friendship status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getFriendshipStatus:', error);
    return null;
  }
}

// ===== CLOSE FRIENDS =====

/**
 * Add a friend to close friends list
 */
export async function addCloseFriend(friendId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { error } = await supabase
      .from('close_friends')
      .insert({
        user_id: user.id,
        friend_id: friendId
      });

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation - already close friends
        return { success: false, error: 'Ya es amigo cercano' };
      }
      console.error('Error adding close friend:', error);
      return { success: false, error: 'Error al agregar amigo cercano' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in addCloseFriend:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Remove a friend from close friends list
 */
export async function removeCloseFriend(friendId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { error } = await supabase
      .from('close_friends')
      .delete()
      .eq('user_id', user.id)
      .eq('friend_id', friendId);

    if (error) {
      console.error('Error removing close friend:', error);
      return { success: false, error: 'Error al remover amigo cercano' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in removeCloseFriend:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Get list of close friends
 */
export async function getCloseFriends(): Promise<FriendProfile[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: closeFriends, error } = await supabase
      .from('close_friends')
      .select('friend_id')
      .eq('user_id', user.id);

    if (error || !closeFriends) {
      console.error('Error fetching close friends:', error);
      return [];
    }

    if (closeFriends.length === 0) return [];

    const friendIds = closeFriends.map(cf => cf.friend_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, is_public')
      .in('id', friendIds);

    if (profilesError) {
      console.error('Error fetching close friend profiles:', profilesError);
      return [];
    }

    return profiles || [];
  } catch (error) {
    console.error('Error in getCloseFriends:', error);
    return [];
  }
}

// ===== SUGGESTED USERS =====

/**
 * Get suggested users to follow (users you're not friends with)
 */
export async function getSuggestedUsers(limit: number = 10): Promise<FriendProfile[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get current friends to exclude
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .in('status', ['pending', 'accepted']);

    const excludeIds = new Set([user.id]);
    (friendships || []).forEach(f => {
      excludeIds.add(f.requester_id);
      excludeIds.add(f.addressee_id);
    });

    // Get public profiles not in exclude list
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, is_public')
      .eq('is_public', true)
      .not('id', 'in', `(${Array.from(excludeIds).join(',')})`)
      .limit(limit);

    if (error) {
      console.error('Error fetching suggested users:', error);
      return [];
    }

    return profiles || [];
  } catch (error) {
    console.error('Error in getSuggestedUsers:', error);
    return [];
  }
}
