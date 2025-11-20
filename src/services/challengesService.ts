/**
 * Multiplayer Challenges Service - Supabase Backend
 * Real-time competitive challenge system with voting
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type {
  MultiplayerChallenge,
  ChallengeSubmission,
  ChallengeLeaderboardEntry,
  ChallengeAchievement,
  ChallengeType,
  ChallengeStatus,
  ChallengeDifficulty
} from '../../types';

// ===================================
// TYPE DEFINITIONS
// ===================================

export interface CreateChallengeInput {
  title: string;
  description: string;
  challenge_type: ChallengeType;
  difficulty: ChallengeDifficulty;
  requirements: string[];
  start_time: string;
  end_time: string;
  voting_end_time: string;
  max_participants?: number;
  is_public?: boolean;
  points_reward?: number;
  participation_points?: number;
  tags?: string[];
}

export interface CreateSubmissionInput {
  challenge_id: string;
  top_id: string;
  bottom_id: string;
  shoes_id: string;
  accessories_ids?: string[];
  caption?: string;
}

// ===================================
// CHALLENGES CRUD
// ===================================

/**
 * Get all public challenges with optional filters
 */
export async function getChallenges(options?: {
  status?: ChallengeStatus | 'all';
  limit?: number;
  offset?: number;
}): Promise<MultiplayerChallenge[]> {
  try {
    let query = supabase
      .from('challenges')
      .select(`
        *,
        creator:profiles!creator_id(
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform to frontend format
    return (data || []).map(challenge => ({
      id: challenge.id,
      creator_id: challenge.creator_id,
      creator_name: challenge.creator?.display_name || 'Unknown',
      creator_avatar: challenge.creator?.avatar_url,
      title: challenge.title,
      description: challenge.description,
      challenge_type: challenge.challenge_type,
      difficulty: challenge.difficulty,
      requirements: challenge.requirements || [],
      created_at: challenge.created_at,
      start_time: challenge.start_time,
      end_time: challenge.end_time,
      voting_end_time: challenge.voting_end_time,
      status: challenge.status,
      max_participants: challenge.max_participants,
      participant_ids: [], // Loaded separately if needed
      participant_count: challenge.participant_count || 0,
      submission_count: challenge.submission_count || 0,
      points_reward: challenge.points_reward || 100,
      participation_points: challenge.participation_points || 10,
      is_public: challenge.is_public,
      tags: challenge.tags || []
    }));
  } catch (error) {
    logger.error('Error fetching challenges:', error);
    return [];
  }
}

/**
 * Get a single challenge by ID with full details
 */
export async function getChallenge(challengeId: string): Promise<MultiplayerChallenge | null> {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        creator:profiles!creator_id(
          id,
          display_name,
          avatar_url
        ),
        participants:challenge_participants(user_id)
      `)
      .eq('id', challengeId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      creator_id: data.creator_id,
      creator_name: data.creator?.display_name || 'Unknown',
      creator_avatar: data.creator?.avatar_url,
      title: data.title,
      description: data.description,
      challenge_type: data.challenge_type,
      difficulty: data.difficulty,
      requirements: data.requirements || [],
      created_at: data.created_at,
      start_time: data.start_time,
      end_time: data.end_time,
      voting_end_time: data.voting_end_time,
      status: data.status,
      max_participants: data.max_participants,
      participant_ids: (data.participants || []).map((p: any) => p.user_id),
      participant_count: data.participant_count || 0,
      submission_count: data.submission_count || 0,
      points_reward: data.points_reward || 100,
      participation_points: data.participation_points || 10,
      is_public: data.is_public,
      tags: data.tags || []
    };
  } catch (error) {
    logger.error('Error fetching challenge:', error);
    return null;
  }
}

/**
 * Create a new challenge
 */
export async function createChallenge(input: CreateChallengeInput): Promise<MultiplayerChallenge | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('challenges')
      .insert({
        creator_id: user.id,
        ...input
      })
      .select()
      .single();

    if (error) throw error;

    // Get full challenge data
    return await getChallenge(data.id);
  } catch (error) {
    logger.error('Error creating challenge:', error);
    return null;
  }
}

/**
 * Join a challenge (add user to participants)
 */
export async function joinChallenge(challengeId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('challenge_participants')
      .insert({
        challenge_id: challengeId,
        user_id: user.id
      });

    if (error) throw error;
    return true;
  } catch (error) {
    logger.error('Error joining challenge:', error);
    return false;
  }
}

/**
 * Leave a challenge
 */
export async function leaveChallenge(challengeId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('challenge_participants')
      .delete()
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    logger.error('Error leaving challenge:', error);
    return false;
  }
}

// ===================================
// SUBMISSIONS
// ===================================

/**
 * Get submissions for a challenge
 */
export async function getChallengeSubmissions(challengeId: string): Promise<ChallengeSubmission[]> {
  try {
    const { data, error } = await supabase
      .from('challenge_submissions')
      .select(`
        *,
        user:profiles!user_id(
          id,
          display_name,
          avatar_url
        ),
        votes:challenge_votes(user_id)
      `)
      .eq('challenge_id', challengeId)
      .order('score', { ascending: false });

    if (error) throw error;

    return (data || []).map(submission => ({
      id: submission.id,
      challenge_id: submission.challenge_id,
      user_id: submission.user_id,
      user_name: submission.user?.display_name || 'Unknown',
      user_avatar: submission.user?.avatar_url,
      top_id: submission.top_id,
      bottom_id: submission.bottom_id,
      shoes_id: submission.shoes_id,
      accessories_ids: submission.accessories_ids || [],
      caption: submission.caption,
      submitted_at: submission.submitted_at,
      votes_count: submission.votes_count || 0,
      voters: (submission.votes || []).map((v: any) => v.user_id),
      score: submission.score || 0,
      is_winner: submission.is_winner || false,
      winner_badge: submission.winner_badge
    }));
  } catch (error) {
    logger.error('Error fetching submissions:', error);
    return [];
  }
}

/**
 * Create a submission for a challenge
 */
export async function createSubmission(input: CreateSubmissionInput): Promise<ChallengeSubmission | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('challenge_submissions')
      .insert({
        user_id: user.id,
        ...input
      })
      .select()
      .single();

    if (error) throw error;

    // Get full submission data
    const submissions = await getChallengeSubmissions(input.challenge_id);
    return submissions.find(s => s.id === data.id) || null;
  } catch (error) {
    logger.error('Error creating submission:', error);
    return null;
  }
}

// ===================================
// VOTING
// ===================================

/**
 * Vote for a submission
 */
export async function voteForSubmission(submissionId: string, challengeId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('challenge_votes')
      .insert({
        submission_id: submissionId,
        challenge_id: challengeId,
        user_id: user.id
      });

    if (error) throw error;
    return true;
  } catch (error) {
    logger.error('Error voting:', error);
    return false;
  }
}

/**
 * Remove vote from a submission
 */
export async function removeVote(submissionId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('challenge_votes')
      .delete()
      .eq('submission_id', submissionId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    logger.error('Error removing vote:', error);
    return false;
  }
}

/**
 * Get user's vote for a challenge (returns submission_id if voted)
 */
export async function getUserVote(challengeId: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('challenge_votes')
      .select('submission_id')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .single();

    if (error) return null;
    return data?.submission_id || null;
  } catch (error) {
    return null;
  }
}

// ===================================
// LEADERBOARD
// ===================================

/**
 * Get global leaderboard (top users by points)
 */
export async function getLeaderboard(limit: number = 10): Promise<ChallengeLeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('user_challenge_stats')
      .select(`
        *,
        user:profiles!user_id(
          id,
          display_name,
          avatar_url
        ),
        achievements:user_achievements(
          achievement:challenge_achievements(*)
        )
      `)
      .order('total_points', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((entry, index) => ({
      rank: index + 1,
      user_id: entry.user_id,
      user_name: entry.user?.display_name || 'Unknown',
      user_avatar: entry.user?.avatar_url,
      total_points: entry.total_points || 0,
      challenges_won: entry.challenges_won || 0,
      challenges_participated: entry.challenges_participated || 0,
      win_rate: entry.challenges_participated > 0
        ? (entry.challenges_won / entry.challenges_participated) * 100
        : 0,
      submissions_count: entry.submissions_count || 0,
      votes_received: entry.votes_received || 0,
      achievement_badges: (entry.achievements || [])
        .filter((a: any) => a.achievement && a.unlocked_at)
        .map((a: any) => a.achievement),
      current_streak: entry.current_streak || 0,
      best_streak: entry.best_streak || 0
    }));
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    return [];
  }
}

/**
 * Get user's stats
 */
export async function getUserStats(userId?: string): Promise<ChallengeLeaderboardEntry | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) return null;

    const { data, error } = await supabase
      .from('user_challenge_stats')
      .select(`
        *,
        user:profiles!user_id(
          id,
          display_name,
          avatar_url
        ),
        achievements:user_achievements(
          achievement:challenge_achievements(*)
        )
      `)
      .eq('user_id', targetUserId)
      .single();

    if (error) return null;

    return {
      rank: data.global_rank || 0,
      user_id: data.user_id,
      user_name: data.user?.display_name || 'Unknown',
      user_avatar: data.user?.avatar_url,
      total_points: data.total_points || 0,
      challenges_won: data.challenges_won || 0,
      challenges_participated: data.challenges_participated || 0,
      win_rate: data.challenges_participated > 0
        ? (data.challenges_won / data.challenges_participated) * 100
        : 0,
      submissions_count: data.submissions_count || 0,
      votes_received: data.votes_received || 0,
      achievement_badges: (data.achievements || [])
        .filter((a: any) => a.achievement && a.unlocked_at)
        .map((a: any) => a.achievement),
      current_streak: data.current_streak || 0,
      best_streak: data.best_streak || 0
    };
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    return null;
  }
}

// ===================================
// ACHIEVEMENTS
// ===================================

/**
 * Get all available achievements
 */
export async function getAchievements(): Promise<ChallengeAchievement[]> {
  try {
    const { data, error } = await supabase
      .from('challenge_achievements')
      .select('*')
      .order('points_value', { ascending: false });

    if (error) throw error;

    return (data || []).map(achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      badge_color: achievement.badge_color,
      points_value: achievement.points_value,
      requirement: achievement.requirement
    }));
  } catch (error) {
    logger.error('Error fetching achievements:', error);
    return [];
  }
}

/**
 * Get user's achievements with progress
 */
export async function getUserAchievements(userId?: string): Promise<ChallengeAchievement[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) return [];

    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:challenge_achievements(*)
      `)
      .eq('user_id', targetUserId);

    if (error) throw error;

    return (data || []).map(ua => ({
      ...ua.achievement,
      progress: ua.progress,
      unlocked_at: ua.unlocked_at
    }));
  } catch (error) {
    logger.error('Error fetching user achievements:', error);
    return [];
  }
}

// ===================================
// REAL-TIME SUBSCRIPTIONS
// ===================================

/**
 * Subscribe to challenge updates (real-time)
 */
export function subscribeToChallenge(
  challengeId: string,
  callback: (challenge: MultiplayerChallenge) => void
) {
  return supabase
    .channel(`challenge:${challengeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'challenges',
        filter: `id=eq.${challengeId}`
      },
      async (payload) => {
        const challenge = await getChallenge(challengeId);
        if (challenge) callback(challenge);
      }
    )
    .subscribe();
}

/**
 * Subscribe to submission updates (real-time voting)
 */
export function subscribeToSubmissions(
  challengeId: string,
  callback: (submissions: ChallengeSubmission[]) => void
) {
  return supabase
    .channel(`submissions:${challengeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'challenge_submissions',
        filter: `challenge_id=eq.${challengeId}`
      },
      async () => {
        const submissions = await getChallengeSubmissions(challengeId);
        callback(submissions);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'challenge_votes'
      },
      async () => {
        const submissions = await getChallengeSubmissions(challengeId);
        callback(submissions);
      }
    )
    .subscribe();
}

/**
 * Subscribe to leaderboard updates
 */
export function subscribeToLeaderboard(
  callback: (leaderboard: ChallengeLeaderboardEntry[]) => void
) {
  return supabase
    .channel('leaderboard')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_challenge_stats'
      },
      async () => {
        const leaderboard = await getLeaderboard();
        callback(leaderboard);
      }
    )
    .subscribe();
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Check if user can join a challenge
 */
export async function canJoinChallenge(challengeId: string): Promise<{ canJoin: boolean; reason?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { canJoin: false, reason: 'Not authenticated' };

    const challenge = await getChallenge(challengeId);
    if (!challenge) return { canJoin: false, reason: 'Challenge not found' };

    if (challenge.status !== 'pending' && challenge.status !== 'active') {
      return { canJoin: false, reason: 'Challenge not accepting participants' };
    }

    if (challenge.max_participants && challenge.participant_count >= challenge.max_participants) {
      return { canJoin: false, reason: 'Challenge is full' };
    }

    if (challenge.participant_ids.includes(user.id)) {
      return { canJoin: false, reason: 'Already participating' };
    }

    return { canJoin: true };
  } catch (error) {
    return { canJoin: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Check if user can submit to a challenge
 */
export async function canSubmit(challengeId: string): Promise<{ canSubmit: boolean; reason?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { canSubmit: false, reason: 'Not authenticated' };

    const challenge = await getChallenge(challengeId);
    if (!challenge) return { canSubmit: false, reason: 'Challenge not found' };

    if (challenge.status !== 'active') {
      return { canSubmit: false, reason: 'Challenge not accepting submissions' };
    }

    if (!challenge.participant_ids.includes(user.id)) {
      return { canSubmit: false, reason: 'Not a participant' };
    }

    // Check if user already submitted
    const submissions = await getChallengeSubmissions(challengeId);
    const hasSubmitted = submissions.some(s => s.user_id === user.id);
    if (hasSubmitted) {
      return { canSubmit: false, reason: 'Already submitted' };
    }

    return { canSubmit: true };
  } catch (error) {
    return { canSubmit: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Check if user can vote on a submission
 */
export async function canVote(challengeId: string, submissionId: string): Promise<{ canVote: boolean; reason?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { canVote: false, reason: 'Not authenticated' };

    const challenge = await getChallenge(challengeId);
    if (!challenge) return { canVote: false, reason: 'Challenge not found' };

    if (challenge.status !== 'voting') {
      return { canVote: false, reason: 'Voting not open' };
    }

    // Check if voting for own submission
    const submissions = await getChallengeSubmissions(challengeId);
    const submission = submissions.find(s => s.id === submissionId);
    if (submission?.user_id === user.id) {
      return { canVote: false, reason: 'Cannot vote for your own submission' };
    }

    // Check if already voted
    const userVote = await getUserVote(challengeId);
    if (userVote) {
      return { canVote: false, reason: 'Already voted in this challenge' };
    }

    return { canVote: true };
  } catch (error) {
    return { canVote: false, reason: 'Error checking eligibility' };
  }
}
