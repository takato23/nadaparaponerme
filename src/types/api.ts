// =====================================================
// SUPABASE API TYPES
// Generated types for No Tengo Nada Para Ponerme
// =====================================================

// ==================== Database Types ====================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      clothing_items: {
        Row: ClothingItem;
        Insert: ClothingItemInsert;
        Update: ClothingItemUpdate;
      };
      outfits: {
        Row: Outfit;
        Insert: OutfitInsert;
        Update: OutfitUpdate;
      };
      friendships: {
        Row: Friendship;
        Insert: FriendshipInsert;
        Update: FriendshipUpdate;
      };
      outfit_likes: {
        Row: OutfitLike;
        Insert: OutfitLikeInsert;
        Update: OutfitLikeUpdate;
      };
      outfit_comments: {
        Row: OutfitComment;
        Insert: OutfitCommentInsert;
        Update: OutfitCommentUpdate;
      };
      borrowed_items: {
        Row: BorrowedItem;
        Insert: BorrowedItemInsert;
        Update: BorrowedItemUpdate;
      };
      packing_lists: {
        Row: PackingList;
        Insert: PackingListInsert;
        Update: PackingListUpdate;
      };
      outfit_schedule: {
        Row: OutfitScheduleRow;
        Insert: OutfitScheduleInsert;
        Update: OutfitScheduleUpdate;
      };
      activity_feed: {
        Row: ActivityFeedItem;
        Insert: ActivityFeedInsert;
        Update: ActivityFeedUpdate;
      };
      style_challenges: {
        Row: StyleChallengeRow;
        Insert: StyleChallengeInsert;
        Update: StyleChallengeUpdate;
      };
      outfit_ratings: {
        Row: OutfitRatingRow;
        Insert: OutfitRatingInsert;
        Update: OutfitRatingUpdate;
      };
      close_friends: {
        Row: CloseFriend;
        Insert: CloseFriendInsert;
        Update: CloseFriendUpdate;
      };
      communities: {
        Row: Community;
        Insert: CommunityInsert;
        Update: CommunityUpdate;
      };
      community_members: {
        Row: CommunityMember;
        Insert: CommunityMemberInsert;
        Update: CommunityMemberUpdate;
      };
    };
    Functions: {
      get_user_feed: {
        Args: {
          p_user_id: string;
          p_filter_type?: string;
          p_limit?: number;
          p_offset?: number;
          p_target_actor_id?: string | null;
        };
        Returns: {
          id: string;
          user_id: string;
          actor_id: string;
          activity_type: string;
          target_type: string;
          target_id: string;
          metadata: any;
          created_at: string;
          actor_username: string;
          actor_avatar: string;
          actor_display_name: string;
        }[];
      };
      get_suggested_users: {
        Args: {
          p_user_id: string;
          p_limit?: number;
        };
        Returns: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string;
          similarity_score: number;
          common_preferences: string[];
        }[];
      };
      Views: {
        [_ in never]: never;
      };
      Enums: {
        [_ in never]: never;
      };
      CompositeTypes: {
        [_ in never]: never;
      };
    };
  };
}

// ==================== Core Types ====================

export type ClothingCategory = 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear' | 'one-piece';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';
export type BorrowStatus = 'requested' | 'approved' | 'borrowed' | 'returned' | 'declined';
export type ActivityType = 'like' | 'comment' | 'follow' | 'borrow_request' | 'borrow_approved' | 'outfit_shared';

// ==================== Profiles ====================

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
  style_preferences: string[];
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_public?: boolean;
  style_preferences?: string[];
}

export interface ProfileUpdate {
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_public?: boolean;
  style_preferences?: string[];
}

// ==================== Clothing Items ====================

export interface AIMetadata {
  category_detected?: ClothingCategory;
  colors?: string[];
  patterns?: string[];
  style_tags?: string[];
  occasion_suggestions?: string[];
  care_instructions?: string;
  material_detected?: string;
  confidence_score?: number;
  neckline?: string;
  sleeve_type?: string;
  vibe_tags?: string[];
  seasons?: Season[];
}

export interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  category: ClothingCategory;
  subcategory: string | null;
  color_primary: string;
  image_url: string;
  thumbnail_url: string | null;
  back_image_url: string | null;
  back_thumbnail_url: string | null;
  ai_metadata: AIMetadata;
  brand: string | null;
  size: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  tags: string[];
  notes: string | null;
  times_worn: number;
  last_worn_at: string | null;
  is_favorite: boolean;
  status: 'owned' | 'wishlist' | 'virtual' | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClothingItemInsert {
  user_id: string;
  name: string;
  category: ClothingCategory;
  subcategory?: string | null;
  color_primary: string;
  image_url: string;
  thumbnail_url?: string | null;
  back_image_url?: string | null;
  back_thumbnail_url?: string | null;
  ai_metadata?: AIMetadata;
  brand?: string | null;
  size?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  tags?: string[];
  notes?: string | null;
  status?: 'owned' | 'wishlist' | 'virtual' | null;
  is_favorite?: boolean;
}

export interface ClothingItemUpdate {
  name?: string;
  category?: ClothingCategory;
  subcategory?: string | null;
  color_primary?: string;
  back_image_url?: string | null;
  back_thumbnail_url?: string | null;
  ai_metadata?: AIMetadata;
  brand?: string | null;
  size?: string | null;
  tags?: string[];
  notes?: string | null;
  status?: 'owned' | 'wishlist' | 'virtual' | null;
  is_favorite?: boolean;
  times_worn?: number;
  last_worn_at?: string | null;
  deleted_at?: string | null;
}

// ==================== Outfits ====================

export interface Outfit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  clothing_item_ids: string[];
  occasion: string | null;
  season: string | null;
  is_public: boolean;
  ai_generated: boolean;
  ai_reasoning: string | null;
  likes_count: number;
  comments_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutfitInsert {
  user_id: string;
  name: string;
  description?: string | null;
  clothing_item_ids: string[];
  occasion?: string | null;
  season?: string | null;
  is_public?: boolean;
  ai_generated?: boolean;
  ai_reasoning?: string | null;
}

export interface OutfitUpdate {
  name?: string;
  description?: string | null;
  clothing_item_ids?: string[];
  occasion?: string | null;
  season?: string | null;
  is_public?: boolean;
  deleted_at?: string | null;
}

// ==================== Friendships ====================

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendshipInsert {
  requester_id: string;
  addressee_id: string;
  status?: FriendshipStatus;
}

export interface FriendshipUpdate {
  status?: FriendshipStatus;
}

// ==================== Close Friends ====================

export interface CloseFriend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
}

export interface CloseFriendInsert {
  user_id: string;
  friend_id: string;
}

export interface CloseFriendUpdate {
  // No updateable fields
}

export interface CloseFriendUpdate {
  // No updateable fields
}

// ==================== Communities ====================

export interface Community {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  category: string;
  created_by: string;
  is_private: boolean;
  members_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityInsert {
  name: string;
  description?: string | null;
  cover_image_url?: string | null;
  category: string;
  created_by: string;
  is_private?: boolean;
}

export interface CommunityUpdate {
  name?: string;
  description?: string | null;
  cover_image_url?: string | null;
  category?: string;
  is_private?: boolean;
}

export interface CommunityMember {
  community_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
}

export interface CommunityMemberInsert {
  community_id: string;
  user_id: string;
  role?: 'admin' | 'moderator' | 'member';
}

export interface CommunityMemberUpdate {
  role?: 'admin' | 'moderator' | 'member';
}

// ==================== Outfit Likes ====================

export interface OutfitLike {
  id: string;
  outfit_id: string;
  user_id: string;
  created_at: string;
}

export interface OutfitLikeInsert {
  outfit_id: string;
  user_id: string;
}

export interface OutfitLikeUpdate {
  // No updateable fields
}

// ==================== Outfit Comments ====================

export interface OutfitComment {
  id: string;
  outfit_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OutfitCommentInsert {
  outfit_id: string;
  user_id: string;
  content: string;
}

export interface OutfitCommentUpdate {
  content?: string;
  deleted_at?: string | null;
}

// ==================== Borrowed Items ====================

export interface BorrowedItem {
  id: string;
  clothing_item_id: string;
  owner_id: string;
  borrower_id: string;
  status: BorrowStatus;
  borrowed_at: string | null;
  expected_return_date: string | null;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BorrowedItemInsert {
  clothing_item_id: string;
  owner_id: string;
  borrower_id: string;
  status?: BorrowStatus;
  expected_return_date?: string | null;
  notes?: string | null;
}

export interface BorrowedItemUpdate {
  status?: BorrowStatus;
  borrowed_at?: string | null;
  returned_at?: string | null;
  notes?: string | null;
}

// ==================== Packing Lists ====================

export interface PackingList {
  id: string;
  user_id: string;
  trip_name: string;
  destination: string | null;
  start_date: string;
  end_date: string;
  outfit_ids: string[];
  ai_suggestions: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackingListInsert {
  user_id: string;
  trip_name: string;
  destination?: string | null;
  start_date: string;
  end_date: string;
  outfit_ids?: string[];
  ai_suggestions?: string | null;
  is_archived?: boolean;
}

export interface PackingListUpdate {
  trip_name?: string;
  destination?: string | null;
  start_date?: string;
  end_date?: string;
  outfit_ids?: string[];
  ai_suggestions?: string | null;
  is_archived?: boolean;
}

// ==================== Outfit Schedule ====================

export interface OutfitScheduleRow {
  id: string;
  user_id: string;
  date: string; // Date in ISO format (YYYY-MM-DD)
  outfit_id: string;
  created_at: string;
  updated_at: string;
}

export interface OutfitScheduleInsert {
  user_id: string;
  date: string;
  outfit_id: string;
}

export interface OutfitScheduleUpdate {
  date?: string;
  outfit_id?: string;
}

// ==================== Activity Feed ====================

export interface ActivityFeedItem {
  id: string;
  user_id: string;
  actor_id: string;
  activity_type: ActivityType;
  target_type: string;
  target_id: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface ActivityFeedInsert {
  user_id: string;
  actor_id: string;
  activity_type: ActivityType;
  target_type: string;
  target_id: string;
  metadata?: Record<string, any>;
  is_read?: boolean;
}

export interface ActivityFeedUpdate {
  is_read?: boolean;
}

// ==================== Style Challenges ====================

export type ChallengeType = 'color' | 'style' | 'occasion' | 'seasonal' | 'creativity' | 'minimalist';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';
export type ChallengeStatus = 'active' | 'completed' | 'skipped';

export interface StyleChallengeRow {
  id: string;
  user_id: string;
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  title: string;
  description: string;
  constraints: string[];
  required_items: string[] | null;
  duration_days: number;
  points_reward: number;
  status: ChallengeStatus;
  outfit_id: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface StyleChallengeInsert {
  user_id: string;
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  title: string;
  description: string;
  constraints: string[];
  required_items?: string[] | null;
  duration_days?: number;
  points_reward?: number;
  status?: ChallengeStatus;
  outfit_id?: string | null;
}

export interface StyleChallengeUpdate {
  status?: ChallengeStatus;
  outfit_id?: string | null;
  completed_at?: string | null;
}

// ==================== Outfit Ratings ====================

export interface OutfitRatingRow {
  id: string;
  user_id: string;
  outfit_id: string;
  rating: number; // 1-5 stars
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutfitRatingInsert {
  user_id: string;
  outfit_id: string;
  rating: number;
  notes?: string | null;
}

export interface OutfitRatingUpdate {
  rating?: number;
  notes?: string | null;
}

// ==================== Enhanced Types with Relations ====================

export interface ClothingItemWithUser extends ClothingItem {
  owner?: Profile;
}

export interface OutfitWithDetails extends Outfit {
  owner?: Profile;
  items?: ClothingItem[];
  likes?: OutfitLike[];
  comments?: OutfitCommentWithUser[];
  is_liked?: boolean; // by current user
}

export interface OutfitCommentWithUser extends OutfitComment {
  user?: Profile;
}

export interface BorrowedItemWithDetails extends BorrowedItem {
  item?: ClothingItem;
  owner?: Profile;
  borrower?: Profile;
}

export interface FriendshipWithProfiles extends Friendship {
  requester?: Profile;
  addressee?: Profile;
}

// ==================== Query Types ====================

export interface ClothingItemFilters {
  category?: ClothingCategory;
  color?: string;
  tags?: string[];
  search?: string;
  is_favorite?: boolean;
}

export interface OutfitFilters {
  occasion?: string;
  season?: string;
  is_public?: boolean;
  is_ai_generated?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortOptions {
  property: 'date' | 'name' | 'color';
  direction: 'asc' | 'desc';
}

// ==================== AI Service Types ====================

export interface GenerateOutfitRequest {
  occasion?: string;
  weather?: string;
  season?: Season;
  color_preference?: string;
  style_preference?: string[];
  item_constraints?: {
    must_include?: string[];
    exclude?: string[];
  };
}

export interface GenerateOutfitResponse {
  outfit_combinations: Array<{
    item_ids: string[];
    reasoning: string;
    style_score: number;
  }>;
}

export interface AnalyzeClothingResponse {
  analysis: AIMetadata;
  confidence: number;
}

export interface GeneratePackingListRequest {
  destination: string;
  start_date: string;
  end_date: string;
  activities?: string[];
  weather_forecast?: string;
}

export interface GeneratePackingListResponse {
  packing_list: string[]; // Item IDs
  outfit_suggestions: string; // Markdown formatted
}

// ==================== API Response Types ====================

export interface APISuccess<T = any> {
  data: T;
  error: null;
}

export interface APIError {
  data: null;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export type APIResponse<T> = APISuccess<T> | APIError;

// Type guards
export function isAPIError<T>(response: APIResponse<T>): response is APIError {
  return response.error !== null;
}

export function isAPISuccess<T>(response: APIResponse<T>): response is APISuccess<T> {
  return response.error === null && response.data !== null;
}

// ==================== AI Image Generation Types ====================

export interface AIGeneratedImage {
  id: string;
  user_id: string;
  prompt: string;
  image_url: string;
  model_used: 'flash' | 'pro';
  generation_time_ms: number;
  created_at: string;
}

export interface DailyGenerationQuota {
  id: string;
  user_id: string;
  date: string;
  flash_count: number;
  pro_count: number;
  plan_type: 'free' | 'pro' | 'premium';
  last_reset_at: string;
}

export interface GenerateImageRequest {
  prompt: string;
  model_type?: 'flash' | 'pro';
  style_preferences?: {
    color_palette?: string[];
    vibe_tags?: string[];
    season?: string;
    category?: 'top' | 'bottom' | 'shoes' | 'accessory';
  };
}

export interface GenerateImageResponse {
  success: boolean;
  image_url?: string;
  generation_time_ms?: number;
  remaining_quota?: number;
  error?: string;
  error_code?: 'QUOTA_EXCEEDED' | 'INVALID_PROMPT' | 'API_ERROR' | 'NETWORK_ERROR';
  upgrade_prompt?: boolean;
}

export interface GenerationStats {
  total_generated: number;
  flash_used: number;
  pro_used: number;
  favorite_prompts: string[];
  peak_generation_hour: number;
  success_rate: number;
}
