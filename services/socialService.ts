import { supabase } from '../src/lib/supabase';

export interface SuggestedUser {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    similarity_score: number;
    common_preferences: string[];
}

/**
 * Fetches suggested users based on style compatibility
 */
export async function fetchSuggestedUsers(limit: number = 5): Promise<SuggestedUser[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase.rpc('get_suggested_users', {
            p_user_id: user.id,
            p_limit: limit
        });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error fetching suggested users:', error);
        return [];
    }
}

/**
 * Follows a user (sends friend request)
 */
export async function followUser(targetUserId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('friendships')
        .insert({
            requester_id: user.id,
            addressee_id: targetUserId,
            status: 'pending'
        });

    if (error) throw error;
}

/**
 * Checks if a user is a close friend
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

    if (error && error.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
        console.error('Error checking close friend status:', error);
        return false;
    }

    return !!data;
}

/**
 * Toggles close friend status
 */
export async function toggleCloseFriend(friendId: string, isClose: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (isClose) {
        // Add to close friends
        const { error } = await supabase
            .from('close_friends')
            .insert({
                user_id: user.id,
                friend_id: friendId
            });
        if (error) throw error;
    } else {
        // Remove from close friends
        const { error } = await supabase
            .from('close_friends')
            .delete()
            .match({
                user_id: user.id,
                friend_id: friendId
            });
        if (error) throw error;
    }
}
