import { supabase } from '../supabase/client';
import { Community, CommunityInsert, CommunityMember } from '../types/api';

/**
 * Fetches all public communities
 */
export async function fetchCommunities(): Promise<Community[]> {
    const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('is_private', false)
        .order('members_count', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Fetches communities the user is a member of
 */
export async function fetchMyCommunities(): Promise<Community[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('community_members')
        .select('community_id, communities(*)')
        .eq('user_id', user.id);

    if (error) throw error;

    // Extract communities from the join
    return (data || []).map((item: any) => item.communities) as Community[];
}

/**
 * Joins a community
 */
export async function joinCommunity(communityId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('community_members')
        .insert({
            community_id: communityId,
            user_id: user.id,
            role: 'member'
        });

    if (error) throw error;
}

/**
 * Leaves a community
 */
export async function leaveCommunity(communityId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id);

    if (error) throw error;
}

/**
 * Creates a new community
 */
export async function createCommunity(community: Omit<CommunityInsert, 'created_by'>): Promise<Community> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('communities')
        .insert({
            ...community,
            created_by: user.id
        })
        .select()
        .single();

    if (error) throw error;

    // Auto-join the creator as admin
    await supabase
        .from('community_members')
        .insert({
            community_id: data.id,
            user_id: user.id,
            role: 'admin'
        });

    return data;
}
