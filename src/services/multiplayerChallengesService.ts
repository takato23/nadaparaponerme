/**
 * Multiplayer Challenges Service (Feature 22)
 * Mock data and utility functions for challenge system
 */

import type {
  MultiplayerChallenge,
  ChallengeSubmission,
  ChallengeLeaderboardEntry,
  ChallengeAchievement,
  ChallengeType,
  ChallengeStatus,
  ChallengeDifficulty
} from '../types';

// ===================================
// MOCK DATA GENERATION
// ===================================

const CHALLENGE_TITLES: Record<ChallengeType, string[]> = {
  style_theme: [
    'Desafío Minimalista',
    'Look Bohemio Extremo',
    'Outfit Elegante de Noche',
    'Street Style Challenge',
    'Vintage Vibes'
  ],
  color_challenge: [
    'Monocromático Negro',
    'Todo en Blanco',
    'Color Block Challenge',
    'Tonos Tierra',
    'Navy & Beige'
  ],
  budget_limit: [
    'Outfit por menos de $10,000',
    'Look Premium con $15,000',
    'Challenge de Presupuesto Ajustado'
  ],
  category_specific: [
    'Solo Vintage',
    'Challenge de Deportivo',
    'Formal sin Saco'
  ],
  seasonal: [
    'Outfit de Verano Perfecto',
    'Look de Invierno Cálido',
    'Primavera Fresca'
  ],
  occasion: [
    'Outfit para Entrevista',
    'Look de Boda',
    'Casual Friday Challenge',
    'Date Night Outfit'
  ],
  mix_match: [
    'Mezcla Imposible',
    'Formal + Deportivo',
    'Clash de Estilos'
  ],
  monochrome: [
    'All Black Everything',
    'White Out Challenge',
    'Monocromático a Elección'
  ],
  pattern_mix: [
    'Mezcla de Estampados',
    'Rayas + Flores',
    'Pattern Overload'
  ],
  trend_recreation: [
    'Y2K Revival',
    '90s Grunge',
    'Old Money Aesthetic'
  ]
};

const CHALLENGE_DESCRIPTIONS: Record<ChallengeType, string> = {
  style_theme: 'Crea un outfit que capture perfectamente este estilo específico.',
  color_challenge: 'Usa solo los colores permitidos para crear un look cohesivo.',
  budget_limit: 'Demuestra que el estilo no depende del precio.',
  category_specific: 'Trabaja con prendas de esta categoría exclusivamente.',
  seasonal: 'Crea el outfit perfecto para esta temporada.',
  occasion: 'Vístete apropiadamente para esta ocasión específica.',
  mix_match: 'Combina lo incompatible y hacelo funcionar.',
  monochrome: 'Un solo color, máximo impacto.',
  pattern_mix: 'Mezcla estampados de forma creativa y armoniosa.',
  trend_recreation: 'Recrea este trend icónico con tu propio twist.'
};

const MOCK_USERS = [
  { id: 'user-1', name: 'Lucía Martínez', avatar: '👩‍🦰' },
  { id: 'user-2', name: 'Martín López', avatar: '👨‍💼' },
  { id: 'user-3', name: 'Sofía García', avatar: '👩‍🎨' },
  { id: 'user-4', name: 'Diego Fernández', avatar: '👨‍🎤' },
  { id: 'user-5', name: 'Valentina Rodríguez', avatar: '👩‍💻' },
  { id: 'user-6', name: 'Santiago Pérez', avatar: '👨‍🚀' },
  { id: 'user-7', name: 'Camila Sánchez', avatar: '👩‍🔬' },
  { id: 'user-8', name: 'Tomás González', avatar: '👨‍🎨' }
];

/**
 * Generate random mock challenges
 */
export function generateMockChallenges(count: number = 10): MultiplayerChallenge[] {
  const challenges: MultiplayerChallenge[] = [];
  const now = new Date();

  const challengeTypes: ChallengeType[] = [
    'style_theme',
    'color_challenge',
    'budget_limit',
    'seasonal',
    'occasion',
    'monochrome',
    'pattern_mix',
    'trend_recreation'
  ];

  for (let i = 0; i < count; i++) {
    const type = challengeTypes[i % challengeTypes.length];
    const creator = MOCK_USERS[i % MOCK_USERS.length];
    const difficulty: ChallengeDifficulty = i < 3 ? 'easy' : i < 7 ? 'medium' : 'hard';

    // Random timing
    const createdHoursAgo = Math.random() * 48;
    const createdAt = new Date(now.getTime() - createdHoursAgo * 60 * 60 * 1000);
    const startTime = new Date(createdAt.getTime() + 1 * 60 * 60 * 1000); // 1h after creation
    const endTime = new Date(startTime.getTime() + (24 + Math.random() * 48) * 60 * 60 * 1000); // 24-72h duration
    const votingEndTime = new Date(endTime.getTime() + 12 * 60 * 60 * 1000); // 12h voting

    // Status logic
    let status: ChallengeStatus;
    if (now < startTime) {
      status = 'pending';
    } else if (now < endTime) {
      status = 'active';
    } else if (now < votingEndTime) {
      status = 'voting';
    } else {
      status = Math.random() > 0.3 ? 'completed' : 'expired';
    }

    // Participants
    const maxParticipants = Math.random() > 0.5 ? undefined : Math.floor(Math.random() * 5 + 5);
    const participantCount = Math.floor(Math.random() * 8 + 2);
    const submissionCount = status === 'pending' ? 0 : Math.floor(participantCount * (0.5 + Math.random() * 0.5));

    // Requirements based on type
    let requirements: string[] = [];
    switch (type) {
      case 'color_challenge':
        requirements = ['Usa solo negro y blanco', 'Sin estampados', 'Mínimo 3 prendas'];
        break;
      case 'budget_limit':
        requirements = ['Presupuesto máximo AR$ 10,000', 'Todas las prendas deben tener precio estimado'];
        break;
      case 'style_theme':
        requirements = ['Estilo minimalista puro', 'Colores neutros únicamente', 'Siluetas limpias'];
        break;
      case 'seasonal':
        requirements = ['Apropiado para verano', 'Telas frescas', 'Protección solar'];
        break;
      case 'occasion':
        requirements = ['Formal pero no rígido', 'Adecuado para oficina creativa'];
        break;
      case 'monochrome':
        requirements = ['Un solo color', 'Texturas variadas permitidas'];
        break;
      case 'pattern_mix':
        requirements = ['Mínimo 2 estampados diferentes', 'Máximo 4 prendas'];
        break;
      case 'trend_recreation':
        requirements = ['Inspirado en Y2K', 'Moderno twist obligatorio'];
        break;
    }

    challenges.push({
      id: `challenge-${Date.now()}-${i}`,
      creator_id: creator.id,
      creator_name: creator.name,
      creator_avatar: creator.avatar,

      title: CHALLENGE_TITLES[type][Math.floor(Math.random() * CHALLENGE_TITLES[type].length)],
      description: CHALLENGE_DESCRIPTIONS[type],
      challenge_type: type,
      difficulty,
      requirements,

      created_at: createdAt.toISOString(),
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      voting_end_time: votingEndTime.toISOString(),
      status,

      max_participants: maxParticipants,
      participant_ids: MOCK_USERS.slice(0, participantCount).map((u) => u.id),
      participant_count: participantCount,
      submission_count: submissionCount,

      points_reward: difficulty === 'easy' ? 100 : difficulty === 'medium' ? 200 : 300,
      participation_points: 25,

      is_public: Math.random() > 0.3,
      tags: [type, difficulty, status]
    });
  }

  return challenges.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Generate mock submissions for a challenge
 */
export function generateMockSubmissions(
  challenge: MultiplayerChallenge,
  itemCount: number = 20
): ChallengeSubmission[] {
  const submissions: ChallengeSubmission[] = [];
  const submissionCount = challenge.submission_count;

  for (let i = 0; i < submissionCount; i++) {
    const user = MOCK_USERS[i % MOCK_USERS.length];
    const votesCount = Math.floor(Math.random() * (challenge.participant_count - 1));

    // Random outfit IDs (would be real ClothingItem IDs in production)
    const topId = `item-${Math.floor(Math.random() * itemCount)}`;
    const bottomId = `item-${Math.floor(Math.random() * itemCount)}`;
    const shoesId = `item-${Math.floor(Math.random() * itemCount)}`;

    submissions.push({
      id: `submission-${challenge.id}-${i}`,
      challenge_id: challenge.id,
      user_id: user.id,
      user_name: user.name,
      user_avatar: user.avatar,

      top_id: topId,
      bottom_id: bottomId,
      shoes_id: shoesId,

      caption: `Mi interpretación del desafío "${challenge.title}"`,
      submitted_at: new Date(
        new Date(challenge.start_time).getTime() + Math.random() * 24 * 60 * 60 * 1000
      ).toISOString(),

      votes_count: votesCount,
      voters: MOCK_USERS.slice(0, votesCount).map((u) => u.id),
      score: votesCount * 10,
      is_winner: false
    });
  }

  // Determine winners for completed challenges
  if (challenge.status === 'completed' && submissions.length > 0) {
    submissions.sort((a, b) => b.score - a.score);
    if (submissions[0]) {
      submissions[0].is_winner = true;
      submissions[0].winner_badge = '🥇';
    }
    if (submissions[1]) {
      submissions[1].winner_badge = '🥈';
    }
    if (submissions[2]) {
      submissions[2].winner_badge = '🥉';
    }
  }

  return submissions.sort((a, b) => b.score - a.score);
}

/**
 * Generate mock leaderboard
 */
export function generateMockLeaderboard(): ChallengeLeaderboardEntry[] {
  const leaderboard: ChallengeLeaderboardEntry[] = [];

  MOCK_USERS.forEach((user, index) => {
    const challengesParticipated = Math.floor(Math.random() * 30 + 10);
    const challengesWon = Math.floor(challengesParticipated * (0.1 + Math.random() * 0.3));
    const winRate = (challengesWon / challengesParticipated) * 100;

    leaderboard.push({
      rank: index + 1,
      user_id: user.id,
      user_name: user.name,
      user_avatar: user.avatar,

      total_points: Math.floor(Math.random() * 5000 + 1000),
      challenges_won: challengesWon,
      challenges_participated: challengesParticipated,
      win_rate: Math.round(winRate),
      submissions_count: challengesParticipated,
      votes_received: Math.floor(challengesParticipated * (5 + Math.random() * 10)),

      achievement_badges: [],
      current_streak: Math.floor(Math.random() * 5),
      best_streak: Math.floor(Math.random() * 10 + 5)
    });
  });

  return leaderboard.sort((a, b) => b.total_points - a.total_points).map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));
}

/**
 * Generate achievement badges
 */
export function generateMockAchievements(): ChallengeAchievement[] {
  return [
    {
      id: 'achievement-first-win',
      name: 'Primera Victoria',
      description: 'Gana tu primer desafío',
      icon: 'emoji_events',
      badge_color: 'bg-yellow-500',
      points_value: 50,
      requirement: 1
    },
    {
      id: 'achievement-hat-trick',
      name: 'Hat Trick',
      description: 'Gana 3 desafíos',
      icon: 'military_tech',
      badge_color: 'bg-orange-500',
      points_value: 150,
      requirement: 3
    },
    {
      id: 'achievement-participation',
      name: 'Participante Activo',
      description: 'Participa en 10 desafíos',
      icon: 'how_to_reg',
      badge_color: 'bg-blue-500',
      points_value: 100,
      requirement: 10
    },
    {
      id: 'achievement-streak-5',
      name: 'Racha Imparable',
      description: 'Participa en 5 desafíos consecutivos',
      icon: 'local_fire_department',
      badge_color: 'bg-red-500',
      points_value: 200,
      requirement: 5
    },
    {
      id: 'achievement-popular',
      name: 'Favorito del Público',
      description: 'Recibe 50 votos en total',
      icon: 'favorite',
      badge_color: 'bg-pink-500',
      points_value: 100,
      requirement: 50
    },
    {
      id: 'achievement-champion',
      name: 'Campeón Invicto',
      description: 'Gana 10 desafíos',
      icon: 'workspace_premium',
      badge_color: 'bg-purple-500',
      points_value: 500,
      requirement: 10
    }
  ];
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Format time remaining until deadline
 */
export function formatTimeRemaining(endTime: string): string {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'Finalizado';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get difficulty badge color
 */
export function getDifficultyBadge(difficulty: ChallengeDifficulty): {
  color: string;
  label: string;
} {
  switch (difficulty) {
    case 'easy':
      return { color: 'bg-green-500', label: 'Fácil' };
    case 'medium':
      return { color: 'bg-yellow-500', label: 'Medio' };
    case 'hard':
      return { color: 'bg-red-500', label: 'Difícil' };
  }
}

/**
 * Get status badge
 */
export function getStatusBadge(status: ChallengeStatus): {
  color: string;
  label: string;
  icon: string;
} {
  switch (status) {
    case 'pending':
      return { color: 'bg-gray-500', label: 'Pendiente', icon: 'schedule' };
    case 'active':
      return { color: 'bg-green-500', label: 'Activo', icon: 'play_circle' };
    case 'voting':
      return { color: 'bg-blue-500', label: 'Votación', icon: 'how_to_vote' };
    case 'completed':
      return { color: 'bg-purple-500', label: 'Completado', icon: 'check_circle' };
    case 'expired':
      return { color: 'bg-gray-400', label: 'Expirado', icon: 'cancel' };
  }
}

/**
 * Calculate score for submission (votes + AI judge bonus)
 */
export function calculateScore(votesCount: number, judgeBonus: number = 0): number {
  return votesCount * 10 + judgeBonus;
}

/**
 * Check if user can join challenge
 */
export function canJoinChallenge(challenge: MultiplayerChallenge, userId: string): {
  canJoin: boolean;
  reason?: string;
} {
  if (challenge.status !== 'pending' && challenge.status !== 'active') {
    return { canJoin: false, reason: 'Challenge no está abierto' };
  }

  if (challenge.participant_ids.includes(userId)) {
    return { canJoin: false, reason: 'Ya estás participando' };
  }

  if (challenge.max_participants && challenge.participant_count >= challenge.max_participants) {
    return { canJoin: false, reason: 'Challenge lleno' };
  }

  const now = new Date();
  const endTime = new Date(challenge.end_time);
  if (now >= endTime) {
    return { canJoin: false, reason: 'Deadline pasó' };
  }

  return { canJoin: true };
}

/**
 * Check if user can submit outfit
 */
export function canSubmitOutfit(challenge: MultiplayerChallenge, userId: string): {
  canSubmit: boolean;
  reason?: string;
} {
  if (challenge.status !== 'active') {
    return { canSubmit: false, reason: 'Challenge no está activo' };
  }

  if (!challenge.participant_ids.includes(userId)) {
    return { canSubmit: false, reason: 'No estás participando' };
  }

  const now = new Date();
  const endTime = new Date(challenge.end_time);
  if (now >= endTime) {
    return { canSubmit: false, reason: 'Deadline pasó' };
  }

  return { canSubmit: true };
}

/**
 * Check if user can vote
 */
export function canVote(
  challenge: MultiplayerChallenge,
  submission: ChallengeSubmission,
  userId: string
): {
  canVote: boolean;
  reason?: string;
} {
  if (challenge.status !== 'voting') {
    return { canVote: false, reason: 'Votación no abierta' };
  }

  if (submission.user_id === userId) {
    return { canVote: false, reason: 'No puedes votarte a vos mismo' };
  }

  if (submission.voters.includes(userId)) {
    return { canVote: false, reason: 'Ya votaste' };
  }

  if (!challenge.participant_ids.includes(userId)) {
    return { canVote: false, reason: 'Solo participantes pueden votar' };
  }

  const now = new Date();
  const votingEnd = new Date(challenge.voting_end_time);
  if (now >= votingEnd) {
    return { canVote: false, reason: 'Votación cerrada' };
  }

  return { canVote: true };
}

/**
 * Format leaderboard rank with medal emojis
 */
export function formatRank(rank: number): string {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return `#${rank}`;
  }
}

/**
 * Get challenge type icon
 */
export function getChallengeTypeIcon(type: ChallengeType): string {
  const icons: Record<ChallengeType, string> = {
    style_theme: 'checkroom',
    color_challenge: 'palette',
    budget_limit: 'attach_money',
    category_specific: 'category',
    seasonal: 'wb_sunny',
    occasion: 'event',
    mix_match: 'shuffle',
    monochrome: 'fiber_manual_record',
    pattern_mix: 'grid_on',
    trend_recreation: 'trending_up'
  };
  return icons[type];
}
