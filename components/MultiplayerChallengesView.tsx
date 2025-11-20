/**
 * Multiplayer Challenges View (Feature 22)
 * Competitive challenges with friends, leaderboard, and achievements
 *
 * FEATURE FLAG: Set USE_SUPABASE = true to use real backend with real-time
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type {
  MultiplayerChallenge,
  ChallengeSubmission,
  ChallengeLeaderboardEntry,
  ChallengeAchievement,
  ChallengeStatus,
  ClothingItem
} from '../types';
import {
  generateMockChallenges,
  generateMockSubmissions,
  generateMockLeaderboard,
  generateMockAchievements,
  formatTimeRemaining,
  getDifficultyBadge,
  getStatusBadge,
  canJoinChallenge as canJoinChallengeMock,
  canSubmitOutfit,
  canVote as canVoteMock,
  formatRank,
  getChallengeTypeIcon
} from '../services/multiplayerChallengesService';
import * as challengesService from '../src/services/challengesService';
import { supabase } from '../src/lib/supabase';
import Loader from './Loader';

// ===================================
// FEATURE FLAG: Toggle Supabase backend
// ===================================
const USE_SUPABASE = true; // Set to true to use real backend with real-time

interface MultiplayerChallengesViewProps {
  closet: ClothingItem[];
  onClose: () => void;
}

type TabType = 'challenges' | 'my-challenges' | 'leaderboard' | 'achievements';

const MultiplayerChallengesView = ({ closet, onClose }: MultiplayerChallengesViewProps) => {
  const [currentTab, setCurrentTab] = useState<TabType>('challenges');
  const [challenges, setChallenges] = useState<MultiplayerChallenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboardEntry[]>([]);
  const [achievements, setAchievements] = useState<ChallengeAchievement[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<MultiplayerChallenge | null>(null);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ChallengeStatus | 'all'>('all');
  const [currentUserId, setCurrentUserId] = useState<string>('user-1'); // Will be updated from auth

  // Get current user from Supabase auth
  useEffect(() => {
    async function getCurrentUser() {
      if (USE_SUPABASE) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
      }
    }
    getCurrentUser();
  }, []);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      if (USE_SUPABASE) {
        // Load from Supabase
        try {
          const [challengesData, leaderboardData, achievementsData] = await Promise.all([
            challengesService.getChallenges({ status: statusFilter, limit: 50 }),
            challengesService.getLeaderboard(10),
            challengesService.getUserAchievements()
          ]);

          setChallenges(challengesData);
          setLeaderboard(leaderboardData);
          setAchievements(achievementsData);
        } catch (error) {
          console.error('Error loading challenges:', error);
        }
        setIsLoading(false);
      } else {
        // Load mock data
        setTimeout(() => {
          setChallenges(generateMockChallenges(15));
          setLeaderboard(generateMockLeaderboard());
          setAchievements(generateMockAchievements());
          setIsLoading(false);
        }, 800);
      }
    }

    loadData();
  }, [statusFilter]); // Reload when filter changes

  // Filter challenges based on status
  const filteredChallenges =
    statusFilter === 'all'
      ? challenges
      : challenges.filter((c) => c.status === statusFilter);

  // My challenges: where I'm a participant
  const myChallenges = challenges.filter((c) => c.participant_ids.includes(currentUserId));

  // Handle challenge click
  const handleChallengeClick = useCallback(async (challenge: MultiplayerChallenge) => {
    setSelectedChallenge(challenge);

    if (USE_SUPABASE) {
      // Load real submissions from Supabase
      const submissionsData = await challengesService.getChallengeSubmissions(challenge.id);
      setSubmissions(submissionsData);
    } else {
      // Use mock data
      setSubmissions(generateMockSubmissions(challenge, closet.length));
    }
  }, [closet.length]);

  // Handle join challenge
  const handleJoinChallenge = useCallback(async (challenge: MultiplayerChallenge) => {
    if (USE_SUPABASE) {
      // Check eligibility with Supabase
      const { canJoin, reason } = await challengesService.canJoinChallenge(challenge.id);
      if (!canJoin) {
        toast.error(reason);
        return;
      }

      // Join via Supabase
      const success = await challengesService.joinChallenge(challenge.id);
      if (success) {
        toast.success('¡Te uniste al desafío! Ahora puedes enviar tu outfit.');
        // Reload challenge to get updated participant count
        const updated = await challengesService.getChallenge(challenge.id);
        if (updated) {
          setChallenges(prev => prev.map(c => c.id === updated.id ? updated : c));
        }
      } else {
        toast.error('Error al unirse al desafío. Intenta de nuevo.');
      }
    } else {
      // Mock join
      const { canJoin, reason } = canJoinChallengeMock(challenge, currentUserId);
      if (!canJoin) {
        toast.error(reason);
        return;
      }

      const updated = challenges.map((c) =>
        c.id === challenge.id
          ? {
              ...c,
              participant_ids: [...c.participant_ids, currentUserId],
              participant_count: c.participant_count + 1
            }
          : c
      );
      setChallenges(updated);
      toast.success('¡Te uniste al desafío! Ahora puedes enviar tu outfit.');
    }
  }, [challenges, currentUserId]);

  // Real-time subscriptions (Supabase only)
  useEffect(() => {
    if (!USE_SUPABASE || !selectedChallenge) return;

    // Subscribe to submissions updates for real-time voting
    const submissionsSubscription = challengesService.subscribeToSubmissions(
      selectedChallenge.id,
      (updatedSubmissions) => {
        setSubmissions(updatedSubmissions);
      }
    );

    // Subscribe to challenge updates (participant count, status changes)
    const challengeSubscription = challengesService.subscribeToChallenge(
      selectedChallenge.id,
      (updatedChallenge) => {
        // Update selected challenge
        setSelectedChallenge(updatedChallenge);
        // Update in challenges list
        setChallenges(prev => prev.map(c => c.id === updatedChallenge.id ? updatedChallenge : c));
      }
    );

    // Cleanup subscriptions on unmount
    return () => {
      submissionsSubscription.unsubscribe();
      challengeSubscription.unsubscribe();
    };
  }, [selectedChallenge]);

  // Subscribe to leaderboard updates (when on leaderboard tab)
  useEffect(() => {
    if (!USE_SUPABASE || currentTab !== 'leaderboard') return;

    const leaderboardSubscription = challengesService.subscribeToLeaderboard((updatedLeaderboard) => {
      setLeaderboard(updatedLeaderboard);
    });

    return () => {
      leaderboardSubscription.unsubscribe();
    };
  }, [currentTab]);

  // Handle vote
  const handleVote = useCallback(async (submission: ChallengeSubmission) => {
    if (!selectedChallenge) return;

    if (USE_SUPABASE) {
      // Check eligibility with Supabase
      const { canVote: canVoteResult, reason } = await challengesService.canVote(
        selectedChallenge.id,
        submission.id
      );
      if (!canVoteResult) {
        toast.warning(reason);
        return;
      }

      // Vote via Supabase
      const success = await challengesService.voteForSubmission(submission.id, selectedChallenge.id);
      if (success) {
        // Submissions will be updated via real-time subscription
        // Or reload manually if real-time not set up yet
        const updatedSubmissions = await challengesService.getChallengeSubmissions(selectedChallenge.id);
        setSubmissions(updatedSubmissions);
      } else {
        toast.error('Error al votar. Intenta de nuevo.');
      }
    } else {
      // Mock vote
      const { canVote: canVoteResult, reason } = canVoteMock(selectedChallenge, submission, currentUserId);
      if (!canVoteResult) {
        toast.warning(reason);
        return;
      }

      const updated = submissions.map((s) =>
        s.id === submission.id
          ? {
              ...s,
              votes_count: s.votes_count + 1,
              voters: [...s.voters, currentUserId],
              score: (s.votes_count + 1) * 10
            }
          : s
      );
      setSubmissions(updated);
    }
  }, [selectedChallenge, currentUserId, submissions]);

  return (
    <div className="fixed inset-0 bg-white dark:bg-background-dark z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
          <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-text-primary dark:text-gray-200">
          Desafíos Multiplayer
        </h1>
        <div className="w-10"></div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 shrink-0 overflow-x-auto">
        {[
          { id: 'challenges', label: 'Desafíos', icon: 'emoji_events' },
          { id: 'my-challenges', label: 'Mis Desafíos', icon: 'person' },
          { id: 'leaderboard', label: 'Ranking', icon: 'leaderboard' },
          { id: 'achievements', label: 'Logros', icon: 'military_tech' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              currentTab === tab.id
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            <span className="text-sm">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader text="Cargando desafíos..." />
          </div>
        ) : (
          <>
            {/* Challenges Tab */}
            {currentTab === 'challenges' && (
              <div className="space-y-4">
                {/* Filter buttons */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'active', label: 'Activos' },
                    { value: 'voting', label: 'Votación' },
                    { value: 'completed', label: 'Completados' }
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value as ChallengeStatus | 'all')}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        statusFilter === filter.value
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Challenges grid */}
                {filteredChallenges.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                      emoji_events
                    </span>
                    <p className="text-gray-500 dark:text-gray-400">No hay desafíos con este filtro</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredChallenges.map((challenge) => (
                      <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        currentUserId={currentUserId}
                        onClick={() => handleChallengeClick(challenge)}
                        onJoin={() => handleJoinChallenge(challenge)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* My Challenges Tab */}
            {currentTab === 'my-challenges' && (
              <div className="space-y-4">
                {myChallenges.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                      person
                    </span>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      No estás participando en ningún desafío
                    </p>
                    <button
                      onClick={() => setCurrentTab('challenges')}
                      className="px-6 py-3 bg-primary text-white rounded-full font-semibold"
                    >
                      Explorar Desafíos
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myChallenges.map((challenge) => (
                      <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        currentUserId={currentUserId}
                        onClick={() => handleChallengeClick(challenge)}
                        onJoin={() => handleJoinChallenge(challenge)}
                        isParticipating
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Leaderboard Tab */}
            {currentTab === 'leaderboard' && (
              <div className="space-y-4">
                <div className="liquid-glass rounded-2xl overflow-hidden">
                  <div className="p-4 bg-primary/10 border-b border-primary/20">
                    <h2 className="text-lg font-bold text-text-primary dark:text-gray-200">
                      Ranking Global
                    </h2>
                    <p className="text-sm text-text-secondary dark:text-gray-400">
                      Top jugadores por puntos acumulados
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {leaderboard.map((entry) => (
                      <LeaderboardRow key={entry.user_id} entry={entry} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Achievements Tab */}
            {currentTab === 'achievements' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      currentProgress={Math.floor(Math.random() * achievement.requirement)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Challenge Detail Modal */}
      {selectedChallenge && (
        <ChallengeDetailModal
          challenge={selectedChallenge}
          submissions={submissions}
          currentUserId={currentUserId}
          onClose={() => setSelectedChallenge(null)}
          onVote={handleVote}
        />
      )}
    </div>
  );
};

// ========================================
// SUB-COMPONENTS
// ========================================

interface ChallengeCardProps {
  challenge: MultiplayerChallenge;
  currentUserId: string;
  onClick: () => void;
  onJoin: () => void;
  isParticipating?: boolean;
}

const ChallengeCard = ({ challenge, currentUserId, onClick, onJoin, isParticipating }: ChallengeCardProps) => {
  const statusBadge = getStatusBadge(challenge.status);
  const difficultyBadge = getDifficultyBadge(challenge.difficulty);
  const timeRemaining = formatTimeRemaining(challenge.end_time);
  const isParticipant = challenge.participant_ids.includes(currentUserId);
  const { canJoin } = canJoinChallenge(challenge, currentUserId);

  return (
    <div
      onClick={onClick}
      className="liquid-glass rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-soft-lg hover:scale-[1.02] active:scale-[0.98]"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-xl">
              {getChallengeTypeIcon(challenge.challenge_type)}
            </span>
            <h3 className="font-bold text-text-primary dark:text-gray-200 line-clamp-1">
              {challenge.title}
            </h3>
          </div>
          <p className="text-sm text-text-secondary dark:text-gray-400 line-clamp-2">
            {challenge.description}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`${statusBadge.color} text-white text-xs px-2 py-1 rounded-full flex items-center gap-1`}>
          <span className="material-symbols-outlined text-sm">{statusBadge.icon}</span>
          {statusBadge.label}
        </span>
        <span className={`${difficultyBadge.color} text-white text-xs px-2 py-1 rounded-full`}>
          {difficultyBadge.label}
        </span>
        {isParticipant && (
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            Participando
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-text-secondary dark:text-gray-400 mb-3">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">group</span>
          <span>{challenge.participant_count} participantes</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">schedule</span>
          <span>{timeRemaining}</span>
        </div>
      </div>

      {/* Creator */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
            {challenge.creator_avatar}
          </div>
          <span className="text-xs text-text-secondary dark:text-gray-400">
            por {challenge.creator_name}
          </span>
        </div>
        <div className="flex items-center gap-1 text-primary">
          <span className="material-symbols-outlined text-sm">workspace_premium</span>
          <span className="text-sm font-semibold">{challenge.points_reward} pts</span>
        </div>
      </div>

      {/* Join button (only if not participating and can join) */}
      {!isParticipant && canJoin && challenge.status === 'active' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoin();
          }}
          className="w-full mt-3 bg-primary text-white py-2 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Unirse al Desafío
        </button>
      )}
    </div>
  );
};

interface LeaderboardRowProps {
  entry: ChallengeLeaderboardEntry;
}

const LeaderboardRow = ({ entry }: LeaderboardRowProps) => {
  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className="text-2xl font-bold w-12 text-center">
          {formatRank(entry.rank)}
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">
            {entry.user_avatar}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-text-primary dark:text-gray-200">
              {entry.user_name}
            </h3>
            <p className="text-xs text-text-secondary dark:text-gray-400">
              {entry.challenges_participated} desafíos • {entry.win_rate}% victoria
            </p>
          </div>
        </div>

        {/* Points */}
        <div className="text-right">
          <div className="text-lg font-bold text-primary">{entry.total_points}</div>
          <p className="text-xs text-text-secondary dark:text-gray-400">puntos</p>
        </div>
      </div>
    </div>
  );
};

interface AchievementCardProps {
  achievement: ChallengeAchievement;
  currentProgress: number;
}

const AchievementCard = ({ achievement, currentProgress }: AchievementCardProps) => {
  const isUnlocked = currentProgress >= achievement.requirement;
  const progressPercent = Math.min((currentProgress / achievement.requirement) * 100, 100);

  return (
    <div
      className={`liquid-glass rounded-2xl p-4 ${
        isUnlocked ? 'border-2 border-primary' : 'opacity-75'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-full ${achievement.badge_color} flex items-center justify-center shrink-0`}
        >
          <span className="material-symbols-outlined text-white text-2xl">
            {achievement.icon}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="font-bold text-text-primary dark:text-gray-200 mb-1">
            {achievement.name}
            {isUnlocked && <span className="ml-2 text-primary">✓</span>}
          </h3>
          <p className="text-sm text-text-secondary dark:text-gray-400 mb-3">
            {achievement.description}
          </p>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-text-secondary dark:text-gray-400">
              <span>
                {currentProgress} / {achievement.requirement}
              </span>
              <span>{achievement.points_value} pts</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ChallengeDetailModalProps {
  challenge: MultiplayerChallenge;
  submissions: ChallengeSubmission[];
  currentUserId: string;
  onClose: () => void;
  onVote: (submission: ChallengeSubmission) => void;
}

const ChallengeDetailModal = ({
  challenge,
  submissions,
  currentUserId,
  onClose,
  onVote
}: ChallengeDetailModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-background-dark rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200 mb-2">
                {challenge.title}
              </h2>
              <p className="text-text-secondary dark:text-gray-400">{challenge.description}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full ml-4"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Requirements */}
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold text-text-primary dark:text-gray-200">
              Requisitos:
            </h3>
            <ul className="space-y-1">
              {challenge.requirements.map((req, i) => (
                <li
                  key={i}
                  className="text-sm text-text-secondary dark:text-gray-400 flex items-start gap-2"
                >
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">
                    check_circle
                  </span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Submissions */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
            Participaciones ({submissions.length})
          </h3>

          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                checkroom
              </span>
              <p className="text-gray-500 dark:text-gray-400">No hay envíos todavía</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => {
                const canVoteResult = canVote(challenge, submission, currentUserId).canVote;

                return (
                  <div
                    key={submission.id}
                    className="liquid-glass rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                          {submission.user_avatar}
                        </div>
                        <div>
                          <h4 className="font-semibold text-text-primary dark:text-gray-200">
                            {submission.user_name}
                            {submission.winner_badge && (
                              <span className="ml-2">{submission.winner_badge}</span>
                            )}
                          </h4>
                          <p className="text-xs text-text-secondary dark:text-gray-400">
                            {submission.caption}
                          </p>
                        </div>
                      </div>

                      {/* Vote button */}
                      {canVoteResult && (
                        <button
                          onClick={() => onVote(submission)}
                          className="px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
                        >
                          Votar
                        </button>
                      )}
                    </div>

                    {/* Votes count */}
                    <div className="flex items-center gap-4 text-sm text-text-secondary dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">thumb_up</span>
                        <span>{submission.votes_count} votos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">star</span>
                        <span>{submission.score} puntos</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerChallengesView;
