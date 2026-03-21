import { supabase } from '../lib/supabase';
import type { SocialNotification } from '../../types';

export async function getSocialNotifications(
  limit: number = 30,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<SocialNotification[]> {
  try {
    const { data, error } = await supabase.rpc('get_social_notifications', {
      p_limit: limit,
      p_offset: offset,
      p_unread_only: unreadOnly,
    });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      actor_id: row.actor_id,
      actor_username: row.actor_username,
      actor_display_name: row.actor_display_name,
      actor_avatar: row.actor_avatar,
      event_type: row.event_type,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      metadata: row.metadata || {},
      read_at: row.read_at,
      created_at: row.created_at,
    })) as SocialNotification[];
  } catch (error) {
    console.error('Error loading social notifications:', error);
    return [];
  }
}

export async function getUnreadSocialNotificationsCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('social_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error loading unread notifications count:', error);
    return 0;
  }
}

export async function markSocialNotificationsRead(ids?: string[]): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('mark_social_notifications_read', {
      p_ids: ids && ids.length > 0 ? ids : null,
      p_mark_all: !ids || ids.length === 0,
    });

    if (error) throw error;
    return Number(data || 0);
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return 0;
  }
}

export function subscribeToSocialNotifications(
  userId: string,
  onEvent: () => void
) {
  const channel = supabase
    .channel(`social-notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'social_notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => onEvent()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
