import { supabase } from '../lib/supabase';

export type ReportTargetType = 'activity' | 'comment' | 'profile';
export type ReportReason = 'spam' | 'abuse' | 'sexual' | 'copyright' | 'other';

export async function reportContent(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const payload = {
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details || null,
  };

  const { error } = await supabase
    .from('content_reports')
    .upsert(payload, { onConflict: 'reporter_id,target_type,target_id' });

  if (error) throw error;
}

export async function blockUser(targetUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (targetUserId === user.id) {
    throw new Error('No podés bloquearte a vos');
  }

  const { error } = await supabase
    .from('user_blocks')
    .upsert(
      {
        blocker_id: user.id,
        blocked_id: targetUserId,
      },
      { onConflict: 'blocker_id,blocked_id' }
    );

  if (error) throw error;

  // Hard unlink follows in both directions.
  await supabase
    .from('user_follows')
    .delete()
    .or(
      `and(follower_id.eq.${user.id},followee_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},followee_id.eq.${user.id})`
    );
}

export async function unblockUser(targetUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', targetUserId);

  if (error) throw error;
}

export async function getBlockedUserIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id);

  if (error) {
    console.error('Error loading blocked users:', error);
    return [];
  }

  return (data || []).map((row: any) => row.blocked_id).filter(Boolean);
}
