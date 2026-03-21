export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "activity_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_comments: {
        Row: {
          activity_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_comments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "activity_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_feed: {
        Row: {
          activity_type: string
          actor_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          activity_type: string
          actor_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          activity_type?: string
          actor_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_reactions: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_reactions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_budget_usage_daily: {
        Row: {
          created_at: string
          credits_used: number
          feature: string
          last_request_at: string | null
          request_count: number
          success_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_used?: number
          feature: string
          last_request_at?: string | null
          request_count?: number
          success_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_used?: number
          feature?: string
          last_request_at?: string | null
          request_count?: number
          success_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_generated_images: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          generation_time_ms: number
          id: string
          image_url: string
          model_type: string
          prompt: string
          storage_path: string
          style_preferences: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          generation_time_ms: number
          id?: string
          image_url: string
          model_type: string
          prompt: string
          storage_path: string
          style_preferences?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          generation_time_ms?: number
          id?: string
          image_url?: string
          model_type?: string
          prompt?: string
          storage_path?: string
          style_preferences?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      ai_insight_cache: {
        Row: {
          closet_hash: string
          created_at: string
          credits_used: number
          expires_at: string
          hit_count: number
          id: string
          insight_type: string
          model: string | null
          prompt_hash: string
          response_json: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          closet_hash: string
          created_at?: string
          credits_used?: number
          expires_at?: string
          hit_count?: number
          id?: string
          insight_type: string
          model?: string | null
          prompt_hash: string
          response_json?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          closet_hash?: string
          created_at?: string
          credits_used?: number
          expires_at?: string
          hit_count?: number
          id?: string
          insight_type?: string
          model?: string | null
          prompt_hash?: string
          response_json?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_insight_jobs: {
        Row: {
          closet_hash: string | null
          created_at: string
          credits_used: number
          error_text: string | null
          id: string
          idempotency_key: string
          insight_type: string
          prompt_hash: string | null
          request_json: Json | null
          response_json: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closet_hash?: string | null
          created_at?: string
          credits_used?: number
          error_text?: string | null
          id?: string
          idempotency_key: string
          insight_type: string
          prompt_hash?: string | null
          request_json?: Json | null
          response_json?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closet_hash?: string | null
          created_at?: string
          credits_used?: number
          error_text?: string | null
          id?: string
          idempotency_key?: string
          insight_type?: string
          prompt_hash?: string | null
          request_json?: Json | null
          response_json?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_request_limits: {
        Row: {
          blocked_until: string | null
          created_at: string | null
          error_count: number
          error_window_start: string | null
          feature: string
          last_error_at: string | null
          last_request_at: string
          updated_at: string | null
          user_id: string
          window_count: number
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string | null
          error_count?: number
          error_window_start?: string | null
          feature: string
          last_error_at?: string | null
          last_request_at?: string
          updated_at?: string | null
          user_id: string
          window_count?: number
          window_start: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string | null
          error_count?: number
          error_window_start?: string | null
          feature?: string
          last_error_at?: string | null
          last_request_at?: string
          updated_at?: string | null
          user_id?: string
          window_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_request_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_access: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          metadata: Json
          premium_override: boolean
          revoked_at: string | null
          source_code: string | null
          unlimited_ai: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          metadata?: Json
          premium_override?: boolean
          revoked_at?: string | null
          source_code?: string | null
          unlimited_ai?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          metadata?: Json
          premium_override?: boolean
          revoked_at?: string | null
          source_code?: string | null
          unlimited_ai?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beta_invite_claims: {
        Row: {
          claimed_at: string
          code: string
          created_at: string
          id: string
          metadata: Json
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          code: string
          created_at?: string
          id?: string
          metadata?: Json
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          code?: string
          created_at?: string
          id?: string
          metadata?: Json
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_invite_claims_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "beta_invite_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      beta_invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          grants_premium: boolean
          grants_unlimited_ai: boolean
          max_uses: number
          metadata: Json
          revoked_at: string | null
          updated_at: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          grants_premium?: boolean
          grants_unlimited_ai?: boolean
          max_uses?: number
          metadata?: Json
          revoked_at?: string | null
          updated_at?: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          grants_premium?: boolean
          grants_unlimited_ai?: boolean
          max_uses?: number
          metadata?: Json
          revoked_at?: string | null
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      billing_plan_buckets: {
        Row: {
          bucket_key: string
          created_at: string
          display_name: string | null
          metadata: Json
          monthly_limit: number
          plan_code: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          bucket_key: string
          created_at?: string
          display_name?: string | null
          metadata?: Json
          monthly_limit: number
          plan_code: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bucket_key?: string
          created_at?: string
          display_name?: string | null
          metadata?: Json
          monthly_limit?: number
          plan_code?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_plan_buckets_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "billing_plan_catalog"
            referencedColumns: ["plan_code"]
          },
        ]
      }
      billing_plan_catalog: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          metadata: Json
          plan_code: string
          sort_order: number
          status: string
          updated_at: string
          version: number
          visible: boolean
          visible_pricing: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          metadata?: Json
          plan_code: string
          sort_order?: number
          status?: string
          updated_at?: string
          version?: number
          visible?: boolean
          visible_pricing?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          metadata?: Json
          plan_code?: string
          sort_order?: number
          status?: string
          updated_at?: string
          version?: number
          visible?: boolean
          visible_pricing?: Json
        }
        Relationships: []
      }
      billing_plan_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          metadata: Json
          plan_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          metadata?: Json
          plan_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          metadata?: Json
          plan_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_plan_features_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "billing_plan_catalog"
            referencedColumns: ["plan_code"]
          },
        ]
      }
      billing_usage_cycles: {
        Row: {
          created_at: string
          cycle_end: string
          cycle_start: string
          entitlements_snapshot: Json
          id: string
          metadata: Json
          plan_code: string
          pricing_snapshot: Json
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_end: string
          cycle_start: string
          entitlements_snapshot?: Json
          id?: string
          metadata?: Json
          plan_code: string
          pricing_snapshot?: Json
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_end?: string
          cycle_start?: string
          entitlements_snapshot?: Json
          id?: string
          metadata?: Json
          plan_code?: string
          pricing_snapshot?: Json
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_usage_cycles_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "billing_plan_catalog"
            referencedColumns: ["plan_code"]
          },
        ]
      }
      billing_usage_events: {
        Row: {
          amount: number
          bucket_key: string
          committed_at: string | null
          created_at: string
          cycle_id: string
          expires_at: string | null
          id: string
          idempotency_key: string | null
          metadata: Json
          released_at: string | null
          request_source: string | null
          reservation_key: string
          reserved_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bucket_key: string
          committed_at?: string | null
          created_at?: string
          cycle_id: string
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          released_at?: string | null
          request_source?: string | null
          reservation_key: string
          reserved_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bucket_key?: string
          committed_at?: string | null
          created_at?: string
          cycle_id?: string
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          released_at?: string | null
          request_source?: string | null
          reservation_key?: string
          reserved_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_usage_events_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "billing_usage_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_user_overrides: {
        Row: {
          bucket_overrides: Json
          created_at: string
          expires_at: string | null
          feature_overrides: Json
          id: string
          metadata: Json
          override_plan_code: string | null
          reason: string | null
          revoked_at: string | null
          source: string
          starts_at: string
          unlimited_buckets: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket_overrides?: Json
          created_at?: string
          expires_at?: string | null
          feature_overrides?: Json
          id?: string
          metadata?: Json
          override_plan_code?: string | null
          reason?: string | null
          revoked_at?: string | null
          source?: string
          starts_at?: string
          unlimited_buckets?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket_overrides?: Json
          created_at?: string
          expires_at?: string | null
          feature_overrides?: Json
          id?: string
          metadata?: Json
          override_plan_code?: string | null
          reason?: string | null
          revoked_at?: string | null
          source?: string
          starts_at?: string
          unlimited_buckets?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_user_overrides_override_plan_code_fkey"
            columns: ["override_plan_code"]
            isOneToOne: false
            referencedRelation: "billing_plan_catalog"
            referencedColumns: ["plan_code"]
          },
        ]
      }
      borrowed_items: {
        Row: {
          borrowed_at: string | null
          borrower_id: string
          clothing_item_id: string
          created_at: string | null
          expected_return_date: string | null
          id: string
          notes: string | null
          owner_id: string
          returned_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          borrowed_at?: string | null
          borrower_id: string
          clothing_item_id: string
          created_at?: string | null
          expected_return_date?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          returned_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          borrowed_at?: string | null
          borrower_id?: string
          clothing_item_id?: string
          created_at?: string | null
          expected_return_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          returned_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "borrowed_items_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowed_items_clothing_item_id_fkey"
            columns: ["clothing_item_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrowed_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_achievements: {
        Row: {
          achievement_key: string
          badge_color: string
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
          points_value: number
          requirement: number
        }
        Insert: {
          achievement_key: string
          badge_color: string
          created_at?: string | null
          description: string
          icon: string
          id?: string
          name: string
          points_value?: number
          requirement?: number
        }
        Update: {
          achievement_key?: string
          badge_color?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          points_value?: number
          requirement?: number
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          accessories_ids: string[] | null
          bottom_id: string
          caption: string | null
          challenge_id: string
          id: string
          is_winner: boolean | null
          score: number | null
          shoes_id: string
          submitted_at: string | null
          top_id: string
          user_id: string
          votes_count: number | null
          winner_badge: string | null
        }
        Insert: {
          accessories_ids?: string[] | null
          bottom_id: string
          caption?: string | null
          challenge_id: string
          id?: string
          is_winner?: boolean | null
          score?: number | null
          shoes_id: string
          submitted_at?: string | null
          top_id: string
          user_id: string
          votes_count?: number | null
          winner_badge?: string | null
        }
        Update: {
          accessories_ids?: string[] | null
          bottom_id?: string
          caption?: string | null
          challenge_id?: string
          id?: string
          is_winner?: boolean | null
          score?: number | null
          shoes_id?: string
          submitted_at?: string | null
          top_id?: string
          user_id?: string
          votes_count?: number | null
          winner_badge?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_votes: {
        Row: {
          challenge_id: string
          id: string
          submission_id: string
          user_id: string
          voted_at: string | null
        }
        Insert: {
          challenge_id: string
          id?: string
          submission_id: string
          user_id: string
          voted_at?: string | null
        }
        Update: {
          challenge_id?: string
          id?: string
          submission_id?: string
          user_id?: string
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_votes_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "challenge_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenge_type: string
          created_at: string | null
          creator_id: string
          description: string
          difficulty: string
          end_time: string
          id: string
          is_public: boolean | null
          max_participants: number | null
          participant_count: number | null
          participation_points: number
          points_reward: number
          requirements: Json | null
          start_time: string
          status: string
          submission_count: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          voting_end_time: string
          winner_submission_id: string | null
        }
        Insert: {
          challenge_type: string
          created_at?: string | null
          creator_id: string
          description: string
          difficulty?: string
          end_time: string
          id?: string
          is_public?: boolean | null
          max_participants?: number | null
          participant_count?: number | null
          participation_points?: number
          points_reward?: number
          requirements?: Json | null
          start_time: string
          status?: string
          submission_count?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          voting_end_time: string
          winner_submission_id?: string | null
        }
        Update: {
          challenge_type?: string
          created_at?: string | null
          creator_id?: string
          description?: string
          difficulty?: string
          end_time?: string
          id?: string
          is_public?: boolean | null
          max_participants?: number | null
          participant_count?: number | null
          participation_points?: number
          points_reward?: number
          requirements?: Json | null
          start_time?: string
          status?: string
          submission_count?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          voting_end_time?: string
          winner_submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      close_friends: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "close_friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "close_friends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clothing_items: {
        Row: {
          ai_analyzed_at: string | null
          ai_last_error: string | null
          ai_metadata: Json | null
          ai_metadata_version: number | null
          ai_status: string | null
          back_image_url: string | null
          back_thumbnail_url: string | null
          brand: string | null
          category: string
          color_primary: string
          created_at: string | null
          deleted_at: string | null
          id: string
          image_url: string
          is_favorite: boolean | null
          last_worn_at: string | null
          link_mode: string
          name: string
          normalization_background: string | null
          normalization_error: string | null
          normalization_mode: string | null
          normalization_status: string | null
          normalized_image_url: string | null
          normalized_thumbnail_url: string | null
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          size: string | null
          source_ref: Json
          status: string
          subcategory: string | null
          tags: string[] | null
          thumbnail_url: string | null
          times_worn: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_analyzed_at?: string | null
          ai_last_error?: string | null
          ai_metadata?: Json | null
          ai_metadata_version?: number | null
          ai_status?: string | null
          back_image_url?: string | null
          back_thumbnail_url?: string | null
          brand?: string | null
          category: string
          color_primary: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          image_url: string
          is_favorite?: boolean | null
          last_worn_at?: string | null
          link_mode?: string
          name: string
          normalization_background?: string | null
          normalization_error?: string | null
          normalization_mode?: string | null
          normalization_status?: string | null
          normalized_image_url?: string | null
          normalized_thumbnail_url?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          size?: string | null
          source_ref?: Json
          status?: string
          subcategory?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          times_worn?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_analyzed_at?: string | null
          ai_last_error?: string | null
          ai_metadata?: Json | null
          ai_metadata_version?: number | null
          ai_status?: string | null
          back_image_url?: string | null
          back_thumbnail_url?: string | null
          brand?: string | null
          category?: string
          color_primary?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string
          is_favorite?: boolean | null
          last_worn_at?: string | null
          link_mode?: string
          name?: string
          normalization_background?: string | null
          normalization_error?: string | null
          normalization_mode?: string | null
          normalization_status?: string | null
          normalized_image_url?: string | null
          normalized_thumbnail_url?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          size?: string | null
          source_ref?: Json
          status?: string
          subcategory?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          times_worn?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clothing_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_generation_quota: {
        Row: {
          count: number | null
          created_at: string | null
          date: string
          id: string
          model_type: string
          plan_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          date: string
          id?: string
          model_type: string
          plan_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          count?: number | null
          created_at?: string | null
          date?: string
          id?: string
          model_type?: string
          plan_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      error_reports: {
        Row: {
          app_version: string | null
          component_stack: string | null
          created_at: string | null
          error_message: string
          error_name: string
          error_stack: string | null
          id: string
          url: string | null
          user_agent: string | null
          user_comment: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          component_stack?: string | null
          created_at?: string | null
          error_message: string
          error_name: string
          error_stack?: string | null
          id?: string
          url?: string | null
          user_agent?: string | null
          user_comment?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          component_stack?: string | null
          created_at?: string | null
          error_message?: string
          error_name?: string
          error_stack?: string | null
          id?: string
          url?: string | null
          user_agent?: string | null
          user_comment?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      face_references: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_primary: boolean | null
          label: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          label?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          label?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string | null
          id: string
          requester_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          addressee_id: string
          created_at?: string | null
          id?: string
          requester_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          addressee_id?: string
          created_at?: string | null
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_looks: {
        Row: {
          auto_saved: boolean | null
          bag_id: string | null
          bottom_id: string | null
          created_at: string | null
          eyewear_id: string | null
          face_refs_used: number | null
          generation_model: string | null
          generation_preset: string | null
          hand_acc_id: string | null
          head_id: string | null
          id: string
          image_url: string
          is_favorite: boolean | null
          is_public: boolean | null
          keep_pose: boolean | null
          notes: string | null
          one_piece_id: string | null
          outerwear_id: string | null
          outfit_id: string | null
          rating: number | null
          selfie_url: string | null
          selfie_used: boolean | null
          share_token: string | null
          shoes_id: string | null
          storage_path: string | null
          tags: Json | null
          thumbnail_url: string | null
          title: string | null
          top_base_id: string | null
          top_mid_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_saved?: boolean | null
          bag_id?: string | null
          bottom_id?: string | null
          created_at?: string | null
          eyewear_id?: string | null
          face_refs_used?: number | null
          generation_model?: string | null
          generation_preset?: string | null
          hand_acc_id?: string | null
          head_id?: string | null
          id?: string
          image_url: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          keep_pose?: boolean | null
          notes?: string | null
          one_piece_id?: string | null
          outerwear_id?: string | null
          outfit_id?: string | null
          rating?: number | null
          selfie_url?: string | null
          selfie_used?: boolean | null
          share_token?: string | null
          shoes_id?: string | null
          storage_path?: string | null
          tags?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          top_base_id?: string | null
          top_mid_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_saved?: boolean | null
          bag_id?: string | null
          bottom_id?: string | null
          created_at?: string | null
          eyewear_id?: string | null
          face_refs_used?: number | null
          generation_model?: string | null
          generation_preset?: string | null
          hand_acc_id?: string | null
          head_id?: string | null
          id?: string
          image_url?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          keep_pose?: boolean | null
          notes?: string | null
          one_piece_id?: string | null
          outerwear_id?: string | null
          outfit_id?: string | null
          rating?: number | null
          selfie_url?: string | null
          selfie_used?: boolean | null
          share_token?: string | null
          shoes_id?: string | null
          storage_path?: string | null
          tags?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          top_base_id?: string | null
          top_mid_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_looks_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      guided_look_sessions: {
        Row: {
          autosave_enabled: boolean
          collected_json: Json
          created_at: string
          expires_at: string
          generated_item_json: Json | null
          id: string
          pending_confirmation_token: string | null
          session_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          autosave_enabled?: boolean
          collected_json?: Json
          created_at?: string
          expires_at?: string
          generated_item_json?: Json | null
          id?: string
          pending_confirmation_token?: string | null
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          autosave_enabled?: boolean
          collected_json?: Json
          created_at?: string
          expires_at?: string
          generated_item_json?: Json | null
          id?: string
          pending_confirmation_token?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ios_push_devices: {
        Row: {
          app_version: string | null
          authorization_status: string
          build_number: string | null
          created_at: string
          device_token: string
          environment: string
          id: string
          last_registered_at: string
          locale_identifier: string | null
          notifications_enabled: boolean
          platform: string
          revoked_at: string | null
          time_zone_identifier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          authorization_status?: string
          build_number?: string | null
          created_at?: string
          device_token: string
          environment?: string
          id?: string
          last_registered_at?: string
          locale_identifier?: string | null
          notifications_enabled?: boolean
          platform?: string
          revoked_at?: string | null
          time_zone_identifier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          authorization_status?: string
          build_number?: string | null
          created_at?: string
          device_token?: string
          environment?: string
          id?: string
          last_registered_at?: string
          locale_identifier?: string | null
          notifications_enabled?: boolean
          platform?: string
          revoked_at?: string | null
          time_zone_identifier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      look_folders: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      outfit_comments: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          id: string
          outfit_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          outfit_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          outfit_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_comments_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_likes: {
        Row: {
          created_at: string | null
          id: string
          outfit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          outfit_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          outfit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_likes_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_ratings: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          outfit_id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          outfit_id: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          outfit_id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_ratings_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_schedule: {
        Row: {
          created_at: string | null
          date: string
          id: string
          outfit_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          outfit_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          outfit_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_schedule_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_wear_feedback: {
        Row: {
          comfort_positive: boolean | null
          confidence_positive: boolean | null
          created_at: string
          date: string
          id: string
          outfit_id: string
          skip_reason: string | null
          source_surface: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comfort_positive?: boolean | null
          confidence_positive?: boolean | null
          created_at?: string
          date: string
          id?: string
          outfit_id: string
          skip_reason?: string | null
          source_surface: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comfort_positive?: boolean | null
          confidence_positive?: boolean | null
          created_at?: string
          date?: string
          id?: string
          outfit_id?: string
          skip_reason?: string | null
          source_surface?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_wear_feedback_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      outfits: {
        Row: {
          ai_generated: boolean | null
          ai_reasoning: string | null
          chat_thread_id: string | null
          clothing_item_ids: string[]
          comments_count: number | null
          context_json: Json | null
          cover_image_url: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          folder_id: string | null
          hero_item_id: string | null
          id: string
          is_public: boolean | null
          likes_count: number | null
          name: string
          occasion: string | null
          reference_summary: string | null
          season: string | null
          share_token: string | null
          source: string | null
          style_notes: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          weather_context: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_reasoning?: string | null
          chat_thread_id?: string | null
          clothing_item_ids: string[]
          comments_count?: number | null
          context_json?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          folder_id?: string | null
          hero_item_id?: string | null
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          name: string
          occasion?: string | null
          reference_summary?: string | null
          season?: string | null
          share_token?: string | null
          source?: string | null
          style_notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          weather_context?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_reasoning?: string | null
          chat_thread_id?: string | null
          clothing_item_ids?: string[]
          comments_count?: number | null
          context_json?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          folder_id?: string | null
          hero_item_id?: string | null
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          name?: string
          occasion?: string | null
          reference_summary?: string | null
          season?: string | null
          share_token?: string | null
          source?: string | null
          style_notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          weather_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outfits_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "look_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfits_hero_item_id_fkey"
            columns: ["hero_item_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_lists: {
        Row: {
          ai_suggestions: string | null
          created_at: string | null
          destination: string | null
          end_date: string
          id: string
          is_archived: boolean | null
          outfit_ids: string[] | null
          start_date: string
          trip_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_suggestions?: string | null
          created_at?: string | null
          destination?: string | null
          end_date: string
          id?: string
          is_archived?: boolean | null
          outfit_ids?: string[] | null
          start_date: string
          trip_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_suggestions?: string | null
          created_at?: string | null
          destination?: string | null
          end_date?: string
          id?: string
          is_archived?: boolean | null
          outfit_ids?: string[] | null
          start_date?: string
          trip_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          status: string
          stripe_payment_intent_id: string | null
          tier: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          status: string
          stripe_payment_intent_id?: string | null
          tier: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string | null
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean | null
          last_four: string | null
          mercadopago_card_id: string | null
          mercadopago_customer_id: string | null
          stripe_payment_method_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          mercadopago_card_id?: string | null
          mercadopago_customer_id?: string | null
          stripe_payment_method_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          mercadopago_card_id?: string | null
          mercadopago_customer_id?: string | null
          stripe_payment_method_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          provider: string
          provider_payment_method_id: string | null
          provider_transaction_id: string
          status: string
          subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          provider_payment_method_id?: string | null
          provider_transaction_id: string
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          provider_payment_method_id?: string | null
          provider_transaction_id?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_tokens_balance: number
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_public: boolean | null
          style_preferences: Json | null
          updated_at: string | null
          username: string
        }
        Insert: {
          ai_tokens_balance?: number
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          is_public?: boolean | null
          style_preferences?: Json | null
          updated_at?: string | null
          username: string
        }
        Update: {
          ai_tokens_balance?: number
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_public?: boolean | null
          style_preferences?: Json | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      social_notifications: {
        Row: {
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          read_at: string | null
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json
          read_at?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_clicks: {
        Row: {
          created_at: string | null
          id: string
          item_category: string | null
          placement_context: string
          search_term: string | null
          sponsor_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_category?: string | null
          placement_context: string
          search_term?: string | null
          sponsor_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_category?: string | null
          placement_context?: string
          search_term?: string | null
          sponsor_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_clicks_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          created_at: string | null
          cta_text: string
          description: string
          icon: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          match_categories: string[] | null
          match_colors: string[] | null
          match_vibes: string[] | null
          name: string
          priority: number | null
          slug: string
          updated_at: string | null
          website_url: string
        }
        Insert: {
          created_at?: string | null
          cta_text?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          match_categories?: string[] | null
          match_colors?: string[] | null
          match_vibes?: string[] | null
          name: string
          priority?: number | null
          slug: string
          updated_at?: string | null
          website_url: string
        }
        Update: {
          created_at?: string | null
          cta_text?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          match_categories?: string[] | null
          match_colors?: string[] | null
          match_vibes?: string[] | null
          name?: string
          priority?: number | null
          slug?: string
          updated_at?: string | null
          website_url?: string
        }
        Relationships: []
      }
      style_challenges: {
        Row: {
          completed_at: string | null
          constraints: Json
          created_at: string | null
          description: string
          difficulty: string
          duration_days: number
          id: string
          outfit_id: string | null
          points_reward: number
          required_items: Json | null
          status: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          constraints?: Json
          created_at?: string | null
          description: string
          difficulty: string
          duration_days?: number
          id?: string
          outfit_id?: string | null
          points_reward?: number
          required_items?: Json | null
          status?: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          constraints?: Json
          created_at?: string | null
          description?: string
          difficulty?: string
          duration_days?: number
          id?: string
          outfit_id?: string | null
          points_reward?: number
          required_items?: Json | null
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "style_challenges_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "style_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stylist_events: {
        Row: {
          action: string
          created_at: string | null
          id: string
          prompt: string | null
          suggestion_json: Json | null
          surface: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          prompt?: string | null
          suggestion_json?: Json | null
          surface?: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          prompt?: string | null
          suggestion_json?: Json | null
          surface?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stylist_item_recommendations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          item_id: string
          reason: string
          score_breakdown: Json
          score_total: number
          status: string
          thread_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          item_id: string
          reason: string
          score_breakdown?: Json
          score_total: number
          status: string
          thread_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          item_id?: string
          reason?: string
          score_breakdown?: Json
          score_total?: number
          status?: string
          thread_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stylist_item_recommendations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stylist_memory: {
        Row: {
          disliked_tags: string[] | null
          last_profile_json: Json | null
          liked_tags: string[] | null
          tone_preference: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          disliked_tags?: string[] | null
          last_profile_json?: Json | null
          liked_tags?: string[] | null
          tone_preference?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          disliked_tags?: string[] | null
          last_profile_json?: Json | null
          liked_tags?: string[] | null
          tone_preference?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stylist_recommendation_blocks: {
        Row: {
          block_until: string
          created_at: string
          item_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          block_until: string
          created_at?: string
          item_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          block_until?: string
          created_at?: string
          item_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stylist_recommendation_blocks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          ai_generations_used: number | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          mercadopago_subscription_id: string | null
          paddle_subscription_id: string | null
          payment_method: string | null
          status: string
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generations_used?: number | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start?: string
          id?: string
          mercadopago_subscription_id?: string | null
          paddle_subscription_id?: string | null
          payment_method?: string | null
          status?: string
          tier?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generations_used?: number | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          mercadopago_subscription_id?: string | null
          paddle_subscription_id?: string | null
          payment_method?: string | null
          status?: string
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_metrics: {
        Row: {
          ai_generations_limit: number
          ai_generations_used: number | null
          created_at: string | null
          id: string
          last_reset: string | null
          lookbook_created_count: number | null
          period_end: string
          period_start: string
          subscription_tier: string
          updated_at: string | null
          user_id: string
          virtual_tryon_count: number | null
        }
        Insert: {
          ai_generations_limit: number
          ai_generations_used?: number | null
          created_at?: string | null
          id?: string
          last_reset?: string | null
          lookbook_created_count?: number | null
          period_end: string
          period_start: string
          subscription_tier: string
          updated_at?: string | null
          user_id: string
          virtual_tryon_count?: number | null
        }
        Update: {
          ai_generations_limit?: number
          ai_generations_used?: number | null
          created_at?: string | null
          id?: string
          last_reset?: string | null
          lookbook_created_count?: number | null
          period_end?: string
          period_start?: string
          subscription_tier?: string
          updated_at?: string | null
          user_id?: string
          virtual_tryon_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          progress: number | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          progress?: number | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          progress?: number | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "challenge_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_stats: {
        Row: {
          best_streak: number | null
          challenges_participated: number | null
          challenges_won: number | null
          current_streak: number | null
          global_rank: number | null
          submissions_count: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
          votes_received: number | null
        }
        Insert: {
          best_streak?: number | null
          challenges_participated?: number | null
          challenges_won?: number | null
          current_streak?: number | null
          global_rank?: number | null
          submissions_count?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
          votes_received?: number | null
        }
        Update: {
          best_streak?: number | null
          challenges_participated?: number | null
          challenges_won?: number | null
          current_streak?: number | null
          global_rank?: number | null
          submissions_count?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
          votes_received?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_tryon_cache: {
        Row: {
          created_at: string
          expires_at: string
          face_refs_signature: string | null
          hit_count: number
          id: string
          keep_pose: boolean
          last_hit_at: string
          model: string
          preset: string
          quality: string
          render_hash: string
          slot_signature: Json
          source_surface: string
          storage_path: string
          updated_at: string
          use_face_refs: boolean
          user_id: string
          view: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          face_refs_signature?: string | null
          hit_count?: number
          id?: string
          keep_pose?: boolean
          last_hit_at?: string
          model: string
          preset: string
          quality: string
          render_hash: string
          slot_signature: Json
          source_surface: string
          storage_path: string
          updated_at?: string
          use_face_refs?: boolean
          user_id: string
          view: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          face_refs_signature?: string | null
          hit_count?: number
          id?: string
          keep_pose?: boolean
          last_hit_at?: string
          model?: string
          preset?: string
          quality?: string
          render_hash?: string
          slot_signature?: Json
          source_surface?: string
          storage_path?: string
          updated_at?: string
          use_face_refs?: boolean
          user_id?: string
          view?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          activated_at: string | null
          activated_user_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          email: string
          id: string
          instagram_handle: string | null
          metadata: Json
          review_notes: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_user_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email: string
          id?: string
          instagram_handle?: string | null
          metadata?: Json
          review_notes?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_user_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
          instagram_handle?: string | null
          metadata?: Json
          review_notes?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      billing_build_buckets_json: {
        Args: {
          p_bucket_overrides?: Json
          p_plan_code: string
          p_unlimited_buckets?: string[]
        }
        Returns: Json
      }
      billing_build_features_json: {
        Args: { p_feature_overrides?: Json; p_plan_code: string }
        Returns: Json
      }
      billing_commit_usage: {
        Args: {
          p_actual_amount?: number
          p_commit?: boolean
          p_metadata?: Json
          p_reservation_key: string
          p_user_id: string
        }
        Returns: {
          amount: number
          bucket_key: string
          code: string
          cycle_id: string
          message: string
          monthly_limit: number
          ok: boolean
          plan_code: string
          remaining: number
          reservation_key: string
          reserved: number
          used: number
        }[]
      }
      billing_ensure_usage_cycle: {
        Args: { p_now?: string; p_user_id: string }
        Returns: {
          buckets: Json
          cycle_end: string
          cycle_id: string
          cycle_start: string
          features: Json
          plan_code: string
          plan_display_name: string
          plan_metadata: Json
          plan_version: number
          plan_visible: boolean
          pricing: Json
          source: string
        }[]
      }
      billing_get_effective_entitlements: {
        Args: { p_user_id: string }
        Returns: Json
      }
      billing_get_usage_summary: { Args: { p_user_id: string }; Returns: Json }
      billing_release_expired_reservations: {
        Args: { p_cycle_id: string }
        Returns: number
      }
      billing_reserve_usage: {
        Args: {
          p_amount?: number
          p_bucket_key: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_request_source?: string
          p_reservation_ttl_seconds?: number
          p_user_id: string
        }
        Returns: {
          amount: number
          bucket_key: string
          code: string
          cycle_id: string
          message: string
          monthly_limit: number
          ok: boolean
          plan_code: string
          remaining: number
          reservation_key: string
          reserved: number
          used: number
        }[]
      }
      billing_resolve_context: {
        Args: { p_now?: string; p_user_id: string }
        Returns: {
          bucket_overrides: Json
          cycle_end: string
          cycle_start: string
          feature_overrides: Json
          plan_code: string
          plan_display_name: string
          plan_metadata: Json
          plan_version: number
          plan_visible: boolean
          pricing: Json
          source: string
          unlimited_buckets: string[]
        }[]
      }
      can_user_generate_outfit: {
        Args: { p_amount?: number; p_user_id: string }
        Returns: boolean
      }
      can_user_save_look: { Args: { p_user_id: string }; Returns: boolean }
      can_user_share_look: { Args: { p_user_id: string }; Returns: boolean }
      check_ai_rate_limit: {
        Args: {
          p_feature: string
          p_max_requests?: number
          p_user_id: string
          p_window_seconds?: number
        }
        Returns: {
          allowed: boolean
          blocked_until: string
          reason: string
          retry_after_seconds: number
        }[]
      }
      check_and_reserve_ai_budget: {
        Args: {
          p_daily_credits_limit?: number
          p_daily_request_limit?: number
          p_daily_success_limit?: number
          p_expected_credits?: number
          p_feature: string
          p_user_id: string
        }
        Returns: {
          allowed: boolean
          credits_used: number
          reason: string
          request_count: number
          retry_after_seconds: number
          success_count: number
        }[]
      }
      check_generation_quota: {
        Args: { p_model_type?: string; p_user_id: string }
        Returns: {
          can_generate: boolean
          current_count: number
          daily_limit: number
          next_reset_at: string
          plan_type: string
          remaining_quota: number
        }[]
      }
      claim_beta_invite: {
        Args: { p_code: string; p_user_id: string }
        Returns: {
          expires_at: string
          message: string
          premium_override: boolean
          remaining_uses: number
          success: boolean
          unlimited_ai: boolean
        }[]
      }
      cleanup_old_generated_looks: { Args: never; Returns: number }
      cleanup_orphaned_generated_looks_storage: {
        Args: { p_dry_run?: boolean; p_limit?: number }
        Returns: {
          deleted_count: number
          deleted_paths: string[]
          orphan_count: number
        }[]
      }
      complete_challenge: {
        Args: { p_challenge_id: string }
        Returns: undefined
      }
      create_activity_comment: {
        Args: {
          p_activity_id: string
          p_content?: string
          p_parent_comment_id?: string
        }
        Returns: {
          activity_id: string
          content: string
          created_at: string
          deleted_at: string
          id: string
          parent_comment_id: string
          replies_count: number
          user_avatar: string
          user_id: string
          user_name: string
        }[]
      }
      ensure_current_user: { Args: { p_user_id: string }; Returns: undefined }
      follow_user: { Args: { p_target_user_id: string }; Returns: undefined }
      get_activity_comments: {
        Args: { p_activity_id: string }
        Returns: {
          activity_id: string
          content: string
          created_at: string
          deleted_at: string
          id: string
          parent_comment_id: string
          replies_count: number
          user_avatar: string
          user_id: string
          user_name: string
        }[]
      }
      get_generated_look_storage_path: {
        Args: { p_image_url: string; p_storage_path: string }
        Returns: string
      }
      get_generation_history: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          ai_metadata: Json
          created_at: string
          generation_time_ms: number
          id: string
          image_url: string
          model_type: string
          prompt: string
        }[]
      }
      get_profile_followers: {
        Args: { p_limit?: number; p_offset?: number; p_profile_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      get_profile_following: {
        Args: { p_limit?: number; p_offset?: number; p_profile_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      get_profile_social_summary: {
        Args: { p_profile_id: string }
        Returns: {
          followers_count: number
          following_count: number
          is_followed_by: boolean
          is_following: boolean
        }[]
      }
      get_quota_statistics: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          date: string
          flash_count: number
          plan_type: string
          pro_count: number
          total_count: number
        }[]
      }
      get_remaining_generations: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_social_notifications: {
        Args: { p_limit?: number; p_offset?: number; p_unread_only?: boolean }
        Returns: {
          actor_avatar: string
          actor_display_name: string
          actor_id: string
          actor_username: string
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          read_at: string
          user_id: string
        }[]
      }
      get_suggested_users: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          avatar_url: string
          common_preferences: string[]
          display_name: string
          id: string
          mutual_follows: number
          recent_activity_score: number
          similarity_score: number
          username: string
        }[]
      }
      get_user_feed: {
        Args: {
          p_filter_type?: string
          p_limit?: number
          p_offset?: number
          p_target_actor_id?: string
          p_user_id: string
        }
        Returns: {
          activity_type: string
          actor_avatar: string
          actor_display_name: string
          actor_id: string
          actor_username: string
          created_at: string
          id: string
          metadata: Json
          target_id: string
          target_type: string
          user_id: string
        }[]
      }
      get_user_look_count: { Args: { p_user_id: string }; Returns: number }
      get_user_quota_status: {
        Args: { p_model_type: string; p_user_id: string }
        Returns: {
          can_generate: boolean
          current_count: number
          daily_limit: number
          plan_type: string
          remaining_quota: number
        }[]
      }
      increment_ai_generation: { Args: { p_user_id: string }; Returns: boolean }
      increment_ai_generation_usage:
        | { Args: { p_user_id: string }; Returns: boolean }
        | { Args: { p_amount?: number; p_user_id: string }; Returns: boolean }
      increment_generation_quota: {
        Args: { p_model_type: string; p_plan_type?: string; p_user_id: string }
        Returns: {
          message: string
          new_count: number
          remaining_quota: number
          success: boolean
        }[]
      }
      increment_times_worn: { Args: { item_id: string }; Returns: undefined }
      is_blocked_pair: {
        Args: { p_user_a: string; p_user_b: string }
        Returns: boolean
      }
      is_close_friend: { Args: { user_uuid: string }; Returns: boolean }
      mark_social_notifications_read: {
        Args: { p_ids?: string[]; p_mark_all?: boolean }
        Returns: number
      }
      normalize_visibility: { Args: { p_metadata: Json }; Returns: string }
      record_ai_budget_success: {
        Args: { p_credits_used?: number; p_feature: string; p_user_id: string }
        Returns: {
          credits_used: number
          success_count: number
        }[]
      }
      record_ai_request_result: {
        Args: {
          p_block_seconds?: number
          p_error_threshold?: number
          p_error_window_seconds?: number
          p_feature: string
          p_success: boolean
          p_user_id: string
        }
        Returns: {
          blocked_until: string
          error_count: number
        }[]
      }
      reset_expired_subscription_periods: { Args: never; Returns: number }
      search_profiles_for_friendship: {
        Args: { p_limit?: number; p_query: string; p_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          id: string
          is_public: boolean
          username: string
        }[]
      }
      soft_delete_generated_image: {
        Args: { p_image_id: string; p_user_id: string }
        Returns: boolean
      }
      toggle_activity_comment_like: {
        Args: { p_comment_id: string }
        Returns: {
          is_active: boolean
          likes_count: number
        }[]
      }
      toggle_activity_reaction: {
        Args: { p_activity_id: string; p_reaction_type: string }
        Returns: {
          is_active: boolean
          likes_count: number
          shares_count: number
        }[]
      }
      unfollow_user: { Args: { p_target_user_id: string }; Returns: undefined }
      update_challenge_statuses: { Args: never; Returns: undefined }
      user_has_feature_access: {
        Args: { p_feature_name: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
