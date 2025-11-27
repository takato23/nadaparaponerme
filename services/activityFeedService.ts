/**
 * Activity Feed Service
 *
 * Provides mock data generation and utility functions for the Friend Activity Feed feature.
 * In production, these functions would be replaced with API calls to Supabase backend.
 */

import type {
  ActivityFeedItem,
  ActivityComment,
  ActivityType,
  SavedOutfit,
  ClothingItem,
  StyleChallenge,
  CapsuleWardrobe,
  Lookbook,
  OutfitRating
} from '../types';

// ===== MOCK DATA GENERATION =====

const MOCK_USERS = [
  { id: 'user-1', name: 'Ana García', avatar: '👩🏻' },
  { id: 'user-2', name: 'Luis Martínez', avatar: '👨🏽' },
  { id: 'user-3', name: 'Sofia Rodriguez', avatar: '👩🏻‍🦱' },
  { id: 'user-4', name: 'Carlos Pérez', avatar: '👨🏻' },
  { id: 'user-5', name: 'María López', avatar: '👩🏽' },
  { id: 'user-6', name: 'Diego Fernández', avatar: '👨🏻‍🦰' },
  { id: 'user-7', name: 'Valentina Torres', avatar: '👩🏽‍🦱' },
  { id: 'user-8', name: 'Mateo Silva', avatar: '👨🏽' },
];

const MOCK_CAPTIONS = [
  'Mi nuevo look favorito 🔥',
  'Outfit perfecto para la oficina 💼',
  'Lista para salir! ✨',
  'Cómoda y con estilo 😊',
  'Nueva adquisición, qué opinan? 👀',
  'Vibes casuales para el fin de semana',
  'Probando un estilo diferente',
  'Este color me encantó! 💙',
  'Minimalismo at its best',
  'Ready para el evento 🎉',
];

const MOCK_TAGS = [
  '#casual', '#formal', '#minimalista', '#colorful',
  '#streetwear', '#elegant', '#comfortable', '#trendy',
  '#classic', '#modern', '#bohemian', '#sporty'
];

import { supabase } from '../src/lib/supabase';

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
    if (!user) throw new Error('User not authenticated');

    // Use the RPC function we created for optimized fetching
    const { data, error } = await supabase.rpc('get_user_feed', {
      p_user_id: user.id,
      p_filter_type: filter,
      p_limit: limit,
      p_offset: page * limit,
      p_target_actor_id: targetActorId || null
    });

    if (error) throw error;

    // Map the raw DB result to ActivityFeedItem
    return (data || []).map((item: any) => ({
      id: item.id,
      user_id: item.actor_id, // In the UI, user_id is the actor
      user_name: item.actor_display_name || item.actor_username || 'Usuario',
      user_avatar: item.actor_avatar,
      activity_type: item.activity_type as ActivityType,
      timestamp: item.created_at,
      caption: item.metadata?.caption,
      tags: item.metadata?.tags,
      likes_count: item.metadata?.likes_count || 0,
      comments_count: item.metadata?.comments_count || 0,
      shares_count: item.metadata?.shares_count || 0,
      is_liked: false, // TODO: Check if current user liked this
      is_shared: false,
      // Populate specific fields based on metadata or separate fetches if needed
      // For now, we assume metadata contains the snapshot of the item
      outfit: item.metadata?.outfit,
      clothing_item: item.metadata?.clothing_item,
      challenge: item.metadata?.challenge,
      capsule: item.metadata?.capsule,
      lookbook: item.metadata?.lookbook,
      outfit_rating: item.metadata?.outfit_rating
    }));
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    // Fallback to mock data if RPC fails (e.g. during development/migration)
    console.warn('Falling back to mock data');
    return generateMockActivityFeed(limit);
  }
}

/**
 * Generates a realistic mock activity feed with various activity types
 * @deprecated Use fetchActivityFeed instead
 */
export function generateMockActivityFeed(count: number = 20): ActivityFeedItem[] {
  const activities: ActivityFeedItem[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
    const hoursAgo = Math.floor(Math.random() * 72) + 1; // 1-72 hours ago
    const timestamp = new Date(now - hoursAgo * 60 * 60 * 1000).toISOString();

    // Random activity type with weighted distribution
    const activityTypes: ActivityType[] = [
      'outfit_shared', 'outfit_shared', 'outfit_shared', // 30% outfits
      'item_added', 'item_added', // 20% items
      'outfit_saved', 'outfit_saved', // 20% saved
      'challenge_completed', // 10% challenges
      'capsule_created', // 10% capsules
      'lookbook_created', // 5% lookbooks
      'style_milestone', // 3% milestones
      'rating_given' // 2% ratings
    ];
    const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];

    const activity: ActivityFeedItem = {
      id: `activity-${i}-${Date.now()}`,
      user_id: user.id,
      user_name: user.name,
      user_avatar: user.avatar,
      activity_type: activityType,
      timestamp,
      caption: Math.random() > 0.3 ? MOCK_CAPTIONS[Math.floor(Math.random() * MOCK_CAPTIONS.length)] : undefined,
      tags: Math.random() > 0.5 ? [
        MOCK_TAGS[Math.floor(Math.random() * MOCK_TAGS.length)],
        MOCK_TAGS[Math.floor(Math.random() * MOCK_TAGS.length)]
      ] : undefined,
      likes_count: Math.floor(Math.random() * 50),
      comments_count: Math.floor(Math.random() * 15),
      shares_count: Math.floor(Math.random() * 10),
      is_liked: Math.random() > 0.7,
      is_shared: Math.random() > 0.9,
    };

    // Add activity-specific content based on type
    switch (activityType) {
      case 'outfit_shared':
      case 'outfit_saved':
        activity.outfit = generateMockOutfit();
        break;
      case 'item_added':
        activity.clothing_item = generateMockClothingItem();
        break;
      case 'challenge_completed':
        activity.challenge = generateMockChallenge();
        break;
      case 'capsule_created':
        activity.capsule = generateMockCapsule();
        break;
      case 'lookbook_created':
        activity.lookbook = generateMockLookbook();
        break;
      case 'rating_given':
        activity.outfit_rating = generateMockRating();
        break;
      case 'style_milestone':
        activity.caption = generateMilestoneCap();
        break;
    }

    activities.push(activity);
  }

  // Sort by timestamp (newest first)
  return activities.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// ===== MOCK CONTENT GENERATORS =====

function generateMockOutfit(): SavedOutfit {
  return {
    id: `outfit-${Date.now()}-${Math.random()}`,
    top_id: 'mock-top',
    bottom_id: 'mock-bottom',
    shoes_id: 'mock-shoes',
    explanation: 'Outfit generado por IA con balance perfecto de colores y estilos.'
  };
}

function generateMockClothingItem(): ClothingItem {
  const colors = ['Negro', 'Blanco', 'Azul', 'Gris', 'Beige', 'Navy', 'Verde'];
  const categories = ['top', 'bottom', 'shoes', 'outerwear', 'accessories'];
  const subcategories = ['Camiseta', 'Jeans', 'Zapatillas', 'Chaqueta', 'Bufanda'];

  // Generate random color for placeholder
  const bgColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  const placeholderSvg = `data:image/svg+xml;base64,${btoa(`
    <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="system-ui" font-size="24" fill="#fff">Mock Item</text>
    </svg>
  `)}`;

  return {
    id: `item-${Date.now()}-${Math.random()}`,
    imageDataUrl: placeholderSvg,
    metadata: {
      category: categories[Math.floor(Math.random() * categories.length)],
      subcategory: subcategories[Math.floor(Math.random() * subcategories.length)],
      color_primary: colors[Math.floor(Math.random() * colors.length)],
      vibe_tags: ['casual', 'modern'],
      seasons: ['all']
    }
  };
}

function generateMockChallenge(): StyleChallenge {
  const challenges = [
    'Monocromático Extremo',
    'Mix de Estampados',
    'Layering Maestro',
    'Color Block Challenge'
  ];

  return {
    id: `challenge-${Date.now()}`,
    title: challenges[Math.floor(Math.random() * challenges.length)],
    description: 'Desafío de estilo completado exitosamente',
    difficulty: Math.random() > 0.5 ? 'medium' : 'hard',
    completed: true,
    constraints: []
  };
}

function generateMockCapsule(): CapsuleWardrobe {
  return {
    id: `capsule-${Date.now()}`,
    name: 'Cápsula Minimalista',
    description: 'Cápsula de 10 prendas versátiles',
    item_ids: [],
    total_outfits_possible: 45,
    color_palette: ['Negro', 'Blanco', 'Gris'],
    created_at: new Date().toISOString()
  };
}

function generateMockLookbook(): Lookbook {
  return {
    id: `lookbook-${Date.now()}`,
    title: 'Looks de Invierno 2025',
    description: 'Colección de outfits para la temporada',
    outfit_ids: [],
    cover_image: undefined,
    is_public: true,
    created_at: new Date().toISOString()
  };
}

function generateMockRating(): OutfitRating {
  return {
    id: `rating-${Date.now()}`,
    outfit_id: 'mock-outfit',
    overall_rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
    style_rating: 4,
    versatility_rating: 4,
    comfort_rating: 5,
    feedback: 'Me encanta esta combinación! 🔥'
  };
}

function generateMilestoneCap(): string {
  const milestones = [
    'Alcancé 50 prendas en mi armario! 🎉',
    'Primera cápsula completada! 💪',
    '100 outfits generados! 🚀',
    '6 meses usando la app! 🎊',
    'Mi armario tiene score de versatilidad 90+! ⭐'
  ];
  return milestones[Math.floor(Math.random() * milestones.length)];
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
    rating_given: 'star'
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
    rating_given: 'calificó un outfit'
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

  // Fallback to date for older activities
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
// These would be replaced with API calls in production

/**
 * Toggles like status on an activity
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
 * Toggles share status on an activity
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
 * Adds a comment to an activity
 */
export function addActivityComment(
  activityId: string,
  content: string,
  activities: ActivityFeedItem[]
): {
  updatedActivities: ActivityFeedItem[],
  newComment: ActivityComment
} {
  const newComment: ActivityComment = {
    id: `comment-${Date.now()}`,
    activity_id: activityId,
    user_id: 'current-user',
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
 * Generates mock comments for an activity
 */
export function generateMockComments(activityId: string, count: number = 3): ActivityComment[] {
  const comments: ActivityComment[] = [];
  const commentTexts = [
    'Me encanta! 😍',
    'Qué buena combinación!',
    'Necesito esa prenda ya! 🔥',
    'Te queda genial!',
    'Dónde compraste eso? 👀',
    'Inspiración total! ✨',
    'Amo ese color!',
    'Perfect outfit! 💯'
  ];

  for (let i = 0; i < count; i++) {
    const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
    const hoursAgo = Math.floor(Math.random() * 24) + 1;

    comments.push({
      id: `comment-${activityId}-${i}`,
      activity_id: activityId,
      user_id: user.id,
      user_name: user.name,
      user_avatar: user.avatar,
      content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
      timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
      likes_count: Math.floor(Math.random() * 5)
    });
  }

  return comments.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Filters activities by type
 */
export function filterActivitiesByType(
  activities: ActivityFeedItem[],
  filterTypes: ActivityType[] | ['all']
): ActivityFeedItem[] {
  if (filterTypes.includes('all' as ActivityType)) {
    return activities;
  }

  return activities.filter(activity =>
    filterTypes.includes(activity.activity_type)
  );
}
