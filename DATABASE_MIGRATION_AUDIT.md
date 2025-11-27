# DATABASE MIGRATION AUDIT REPORT
**Project**: No Tengo Nada Para Ponerme
**Date**: 2025-11-26
**Location**: `/Users/santiagobalosky/no-tengo-nada-para-ponerme/supabase/migrations/`

---

## EXECUTIVE SUMMARY

**Total Migration Files**: 26 SQL files (4,290 lines total)
**Applied Migrations**: 3 (confirmed in DEPLOY_ALL_PENDING.sql)
**Pending Migrations**: 15+
**Manual Migrations**: 2
**Verification Scripts**: 1
**Status**: Critical - Multiple pending migrations, schema conflicts detected

---

## MIGRATION INVENTORY (Chronological Order)

### Phase 1: Foundation (APPLIED ✅)
1. **`20250101000001_initial_schema.sql`** - 288 lines ✅
   - Core tables: profiles, clothing_items, outfits, friendships, outfit_likes, outfit_comments, borrowed_items, packing_lists, activity_feed
   - UUID extension enabled
   - Basic relationships and constraints

2. **`20250101000002_triggers_and_rls.sql`** - 390 lines ✅
   - 11 database triggers (denormalization, updated_at)
   - 9 tables with RLS enabled
   - 35+ RLS policies for data privacy
   - Friend-based access control

3. **`20250101000003_storage_setup.sql`** - 144 lines ✅
   - Storage buckets: clothing-images, avatars, outfit-shares
   - Bucket-level RLS policies
   - File size limits

### Phase 2: Feature Extensions (PENDING ⏳)
4. **`20250101000004_outfit_schedule.sql`** - 73 lines ⏳
   - Table: outfit_schedules
   - Weekly outfit planning feature
   - Dependencies: outfits table

5. **`20250101000005_style_challenges.sql`** - 79 lines ⏳
   - Tables: style_challenges, challenge_participations
   - Gamification system
   - Dependencies: profiles, outfits

6. **`20250101000006_outfit_ratings.sql`** - 57 lines ⏳
   - Table: outfit_ratings
   - User feedback system
   - Dependencies: outfits

7. **`20250101000007_closet_gap_analysis.sql`** - 68 lines ⏳
   - Table: closet_gap_analysis
   - AI-powered wardrobe recommendations
   - Dependencies: clothing_items

8. **`20250101000008_subscriptions_and_payments.sql`** - 396 lines ⏳
   - Tables: subscriptions, payment_transactions, payment_methods, usage_metrics
   - Functions: user_has_feature_access, increment_ai_generation_usage
   - MercadoPago + Stripe support
   - Dependencies: profiles

9. **`20250116000009_multiplayer_challenges.sql`** - 586 lines ⏳
   - Tables: multiplayer_challenges, challenge_teams, team_members, challenge_submissions, challenge_votes
   - Complex collaborative features
   - Dependencies: style_challenges, profiles

### Phase 3: Social Features (PENDING ⏳)
10. **`20251119000001_add_close_friends.sql`** - 46 lines ⏳
    - Table: close_friends
    - Enhanced friendship system
    - Dependencies: friendships

11. **`20251119000002_optimize_feed.sql`** - 65 lines ⏳
    - Performance optimization for activity_feed
    - Materialized views or indexes
    - Dependencies: activity_feed

12. **`20251119000003_suggested_users.sql`** - 75 lines ⏳
    - Table: suggested_users
    - User recommendation engine
    - Dependencies: profiles, friendships

13. **`20251119000004_communities.sql`** - 92 lines ⏳
    - Tables: communities, community_members
    - Group functionality
    - Dependencies: profiles

14. **`20251119000005_community_feed.sql`** - 73 lines ⏳
    - Community-specific activity feed
    - Dependencies: communities, activity_feed

15. **`20251119000006_innovation.sql`** - 120 lines ⏳
    - Innovation/experimental features
    - Unknown dependencies (needs review)

16. **`20251119000007_profile_feed.sql`** - 71 lines ⏳
    - User-specific feed enhancements
    - Dependencies: profiles, activity_feed

### Phase 4: Payments Infrastructure (CONFLICT ⚠️)
17. **`20251119000008_subscriptions.sql`** - 186 lines ⚠️
    - **CONFLICT**: Overlaps with 20250101000008_subscriptions_and_payments.sql
    - References `auth.users` instead of `profiles(id)`
    - Different schema design
    - Tables: subscriptions, usage_metrics, payment_history
    - Stripe-only (no MercadoPago)

18. **`20251119000009_fix_payment_schema.sql`** - 99 lines ⚠️
    - **CONFLICT**: Attempts to fix schema conflicts
    - Adds payment_transactions, payment_methods
    - Uses conditional table creation (IF NOT EXISTS)
    - MercadoPago support added retroactively

### Phase 5: AI Image Generation (PENDING ⏳)
19. **`20251120000001_ai_image_generation.sql`** - 158 lines ⏳
    - Tables: ai_generated_images, daily_generation_quota
    - Functions: get_user_quota_status, cleanup_old_quotas
    - Subscription tier integration
    - Dependencies: subscriptions

20. **`20251120000002_ai_images_storage.sql`** - 54 lines ⏳
    - Storage bucket: ai-generated-images (private, 2MB limit)
    - Storage RLS policies
    - Dependencies: ai_generated_images

21. **`20251120171325_enhance_ai_image_generation.sql`** - 337 lines ⏳
    - Enhanced quota functions (8 total functions)
    - JSONB metadata columns
    - Advanced analytics
    - Dependencies: 20251120000001, 20251120000002

### Manual Migrations (DO NOT AUTO-RUN ⛔)
22. **`MANUAL_RUN_subscriptions_and_payments.sql`** - 331 lines ⛔
    - **WHY MANUAL**: Complete subscription system redesign
    - **Reason**: Requires data migration from existing subscriptions
    - **Dependencies**: Must run AFTER migration #8 applied
    - **Changes**: Adds MercadoPago support, restructures payment_transactions
    - **Impact**: Breaking changes to subscriptions table schema

23. **`apply_style_challenges.sql`** - 109 lines ⛔
    - **WHY MANUAL**: Data population script
    - **Reason**: Seed data for style challenges
    - **Dependencies**: 20250101000005_style_challenges.sql
    - **Changes**: Inserts sample challenge data
    - **Impact**: Non-breaking, but should run after schema creation

### Utility Scripts
24. **`verify_ai_image_generation.sql`** - 370 lines 🔍
    - Comprehensive verification queries
    - Tests all 8 AI image functions
    - Validates RLS policies and indexes

25. **`DEPLOY_ALL_PENDING.sql`** - 16 lines 📋
    - **Status**: INCOMPLETE placeholder
    - **Notes**: Only contains migration list, not actual SQL
    - **Purpose**: Was meant to batch-deploy migrations 4-18

26. **`fix_clothing_images_public.sql`** - 7 lines 🔧
    - **Purpose**: Storage bucket permission fix
    - **Status**: Standalone utility migration
    - **Impact**: Makes clothing-images bucket public

---

## CRITICAL ISSUES FOUND

### 🔴 Issue #1: Subscription Schema Conflicts
**Severity**: Critical
**Affected Files**:
- `20250101000008_subscriptions_and_payments.sql` (references `profiles(id)`)
- `20251119000008_subscriptions.sql` (references `auth.users(id)`)
- `20251119000009_fix_payment_schema.sql` (attempts compatibility fix)

**Problem**: Two competing subscription system designs
- Migration #8: Uses `profiles` table FK, includes MercadoPago
- Migration #17: Uses `auth.users` FK, Stripe-only
- Migration #18: Attempts to reconcile with conditional logic

**Resolution Required**:
1. Choose one canonical schema design
2. Remove duplicate migration files
3. Create data migration path if #17 was already applied

**Recommendation**: Use migration #8 (profiles-based, MercadoPago support)

### ⚠️ Issue #2: DEPLOY_ALL_PENDING.sql is Empty
**Severity**: High
**Problem**: File contains only comments, no executable SQL
**Impact**: Cannot batch-deploy pending migrations as intended
**Resolution**: File should be removed or properly implemented

### ⚠️ Issue #3: MANUAL_RUN Migration Unclear
**Severity**: Medium
**Problem**: No documentation explaining when/how to run MANUAL_RUN_subscriptions_and_payments.sql
**Impact**: Risk of applying migration at wrong time
**Resolution**: Add clear instructions in file header

### ⚠️ Issue #4: Missing Dependency Validation
**Severity**: Medium
**Problem**: No validation that required tables exist before running dependent migrations
**Example**: Migration #19 (AI images) assumes subscriptions table exists
**Resolution**: Add dependency checks at top of each migration

### ⚠️ Issue #5: Undocumented Innovation Features
**Severity**: Low
**File**: `20251119000006_innovation.sql`
**Problem**: No description of what "innovation" features are
**Resolution**: Add documentation or rename to describe actual features

---

## DEPENDENCY GRAPH

```
20250101000001_initial_schema.sql (profiles, clothing_items, outfits, etc.)
  ├─→ 20250101000002_triggers_and_rls.sql
  ├─→ 20250101000003_storage_setup.sql
  ├─→ 20250101000004_outfit_schedule.sql (needs: outfits)
  ├─→ 20250101000005_style_challenges.sql (needs: profiles, outfits)
  │    ├─→ apply_style_challenges.sql (MANUAL seed data)
  │    └─→ 20250116000009_multiplayer_challenges.sql
  ├─→ 20250101000006_outfit_ratings.sql (needs: outfits)
  ├─→ 20250101000007_closet_gap_analysis.sql (needs: clothing_items)
  ├─→ 20250101000008_subscriptions_and_payments.sql (needs: profiles)
  │    ├─→ MANUAL_RUN_subscriptions_and_payments.sql ⚠️ CONFLICT
  │    ├─→ 20251119000008_subscriptions.sql ⚠️ DUPLICATE
  │    └─→ 20251119000009_fix_payment_schema.sql ⚠️ FIX ATTEMPT
  ├─→ 20251119000001_add_close_friends.sql (needs: friendships)
  ├─→ 20251119000002_optimize_feed.sql (needs: activity_feed)
  ├─→ 20251119000003_suggested_users.sql (needs: profiles, friendships)
  ├─→ 20251119000004_communities.sql (needs: profiles)
  │    └─→ 20251119000005_community_feed.sql
  ├─→ 20251119000006_innovation.sql (dependencies unknown)
  └─→ 20251119000007_profile_feed.sql (needs: profiles, activity_feed)

Subscriptions Branch (after #8 applied):
20250101000008_subscriptions_and_payments.sql
  └─→ 20251120000001_ai_image_generation.sql (needs: subscriptions)
       ├─→ 20251120000002_ai_images_storage.sql
       └─→ 20251120171325_enhance_ai_image_generation.sql
```

---

## RECOMMENDED EXECUTION ORDER

### Phase 1: Resolve Conflicts (REQUIRED BEFORE PROCEEDING)
```sql
-- Step 1: Decide on subscription schema
-- Option A: Use 20250101000008_subscriptions_and_payments.sql (RECOMMENDED)
-- Option B: Use 20251119000008_subscriptions.sql + 20251119000009_fix_payment_schema.sql

-- Step 2: Remove conflicting files
-- If Option A chosen:
--   - Delete 20251119000008_subscriptions.sql
--   - Delete 20251119000009_fix_payment_schema.sql
--   - Review MANUAL_RUN_subscriptions_and_payments.sql necessity

-- If Option B chosen:
--   - Modify 20250101000008_subscriptions_and_payments.sql to reference auth.users
--   - Keep 20251119000009_fix_payment_schema.sql
```

### Phase 2: Apply Core Feature Migrations (Assuming Option A)
```bash
# Navigation to project directory
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme

# Apply in this exact order:
supabase db push 20250101000004_outfit_schedule.sql
supabase db push 20250101000005_style_challenges.sql
supabase db push 20250101000006_outfit_ratings.sql
supabase db push 20250101000007_closet_gap_analysis.sql
supabase db push 20250101000008_subscriptions_and_payments.sql
supabase db push 20250116000009_multiplayer_challenges.sql
```

### Phase 3: Apply Social Features
```bash
supabase db push 20251119000001_add_close_friends.sql
supabase db push 20251119000002_optimize_feed.sql
supabase db push 20251119000003_suggested_users.sql
supabase db push 20251119000004_communities.sql
supabase db push 20251119000005_community_feed.sql
supabase db push 20251119000007_profile_feed.sql
```

### Phase 4: Apply AI Image Generation
```bash
supabase db push 20251120000001_ai_image_generation.sql
supabase db push 20251120000002_ai_images_storage.sql
supabase db push 20251120171325_enhance_ai_image_generation.sql
```

### Phase 5: Manual Migrations (RUN MANUALLY IN SQL EDITOR)
```bash
# Apply through Supabase Dashboard SQL Editor:
# https://supabase.com/dashboard/project/{YOUR_PROJECT_ID}/sql/new

# 1. Seed style challenges data
cat supabase/migrations/apply_style_challenges.sql
# Copy and execute in SQL editor

# 2. If needed, apply subscription enhancements
cat supabase/migrations/MANUAL_RUN_subscriptions_and_payments.sql
# Copy and execute in SQL editor (ONLY if schema differs from migration #8)
```

### Phase 6: Utility Fixes
```bash
# Fix storage permissions if needed
supabase db push fix_clothing_images_public.sql
```

---

## VALIDATION COMMANDS

### Check Current Database State
```sql
-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables (after all migrations):
-- activity_feed
-- ai_generated_images
-- borrowed_items
-- challenge_participations
-- challenge_submissions
-- challenge_teams
-- challenge_votes
-- close_friends
-- closet_gap_analysis
-- clothing_items
-- communities
-- community_members
-- daily_generation_quota
-- friendships
-- multiplayer_challenges
-- outfit_comments
-- outfit_likes
-- outfit_ratings
-- outfit_schedules
-- outfits
-- packing_lists
-- payment_methods
-- payment_transactions
-- profiles
-- style_challenges
-- subscriptions
-- suggested_users
-- team_members
-- usage_metrics
```

### Verify RLS Policies
```sql
-- Count RLS policies per table
SELECT
  schemaname,
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Expected: 35+ policies across 20+ tables
```

### Check Triggers
```sql
-- List all triggers
SELECT
  event_object_table AS table_name,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Expected: 11+ triggers for updated_at, denormalization
```

### Verify Functions
```sql
-- List all custom functions
SELECT
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name NOT LIKE 'pg_%'
ORDER BY routine_name;

-- Expected functions:
-- check_generation_quota
-- cleanup_old_ai_data
-- cleanup_old_quotas
-- get_generation_history
-- get_quota_statistics
-- get_user_quota_status
-- increment_ai_generation_usage
-- increment_generation_quota
-- initialize_user_subscription (if #17 applied)
-- soft_delete_generated_image
-- update_outfit_comments_count
-- update_outfit_likes_count
-- update_updated_at
-- user_has_feature_access
```

### Check Storage Buckets
```sql
-- List storage buckets
SELECT
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets
ORDER BY name;

-- Expected buckets:
-- ai-generated-images (private, 2MB)
-- avatars (public)
-- clothing-images (private OR public depending on fix)
-- outfit-shares (public)
```

---

## MISSING TABLES ANALYSIS

Based on migration files, the following tables should exist after full deployment:

### Core Tables (Applied ✅)
- profiles
- clothing_items
- outfits
- friendships
- outfit_likes
- outfit_comments
- borrowed_items
- packing_lists
- activity_feed

### Feature Tables (Pending ⏳)
- outfit_schedules
- style_challenges
- challenge_participations
- outfit_ratings
- closet_gap_analysis
- subscriptions
- payment_transactions
- payment_methods
- usage_metrics
- multiplayer_challenges
- challenge_teams
- team_members
- challenge_submissions
- challenge_votes
- close_friends
- suggested_users
- communities
- community_members
- ai_generated_images
- daily_generation_quota

### Total Expected: 30 tables

---

## ROLLBACK PROCEDURES

### Rollback Individual Migration
```sql
-- Example: Rollback AI image generation
BEGIN;
  DROP TRIGGER IF EXISTS trigger_update_quota_timestamp ON daily_generation_quota;
  DROP FUNCTION IF EXISTS update_quota_timestamp();
  DROP FUNCTION IF EXISTS cleanup_old_quotas();
  DROP FUNCTION IF EXISTS get_user_quota_status(UUID, TEXT);
  DROP FUNCTION IF EXISTS check_generation_quota(UUID, TEXT);
  DROP FUNCTION IF EXISTS increment_generation_quota(UUID, TEXT);
  DROP FUNCTION IF EXISTS get_generation_history(UUID, INTEGER, INTEGER);
  DROP FUNCTION IF EXISTS get_quota_statistics(UUID, INTEGER);
  DROP FUNCTION IF EXISTS soft_delete_generated_image(UUID, UUID);
  DROP FUNCTION IF EXISTS cleanup_old_ai_data();
  DROP TABLE IF EXISTS ai_generated_images CASCADE;
  DROP TABLE IF EXISTS daily_generation_quota CASCADE;
COMMIT;
```

### Rollback Storage Bucket
```sql
-- Example: Remove AI images storage
DELETE FROM storage.objects WHERE bucket_id = 'ai-generated-images';
DELETE FROM storage.buckets WHERE id = 'ai-generated-images';
```

### Nuclear Option: Reset to Base Schema
```bash
# WARNING: This deletes ALL data
supabase db reset

# Then re-apply only base migrations:
supabase db push 20250101000001_initial_schema.sql
supabase db push 20250101000002_triggers_and_rls.sql
supabase db push 20250101000003_storage_setup.sql
```

---

## RISK ASSESSMENT

### High Risk Operations
1. **Applying conflicting subscription migrations** (Risk: Data corruption)
2. **Running MANUAL_RUN without understanding context** (Risk: Duplicate data)
3. **Skipping dependency migrations** (Risk: FK constraint violations)

### Medium Risk Operations
1. **Applying multiplayer_challenges.sql** (586 lines, complex relationships)
2. **Running cleanup functions manually** (Risk: Data loss)
3. **Modifying RLS policies in production** (Risk: Data exposure)

### Low Risk Operations
1. **Applying social feature migrations** (Well-isolated features)
2. **Adding indexes/optimization migrations** (Non-breaking)
3. **Running verification scripts** (Read-only)

---

## RECOMMENDATIONS

### Immediate Actions Required
1. **Delete duplicate subscription migrations**:
   - Remove `20251119000008_subscriptions.sql`
   - Remove `20251119000009_fix_payment_schema.sql`
   - Keep `20250101000008_subscriptions_and_payments.sql`

2. **Update MANUAL_RUN file header** with:
   - When to run this migration
   - Prerequisites checklist
   - Expected database state before/after

3. **Delete or implement DEPLOY_ALL_PENDING.sql**:
   - Either implement proper batch script
   - Or delete to avoid confusion

4. **Add dependency validation** to all migration files:
   ```sql
   -- Example for ai_image_generation.sql
   DO $$
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
       RAISE EXCEPTION 'subscriptions table must exist. Run 20250101000008_subscriptions_and_payments.sql first.';
     END IF;
   END $$;
   ```

### Best Practices for Future Migrations
1. **Use timestamp-based naming**: `YYYYMMDDHHMMSS_feature_name.sql`
2. **Add file headers** with description, dependencies, breaking changes
3. **Include rollback SQL** as comments at bottom of each migration
4. **Test migrations** on local Supabase instance first
5. **Document manual migrations** in separate MANUAL_MIGRATIONS.md file
6. **Avoid duplicate feature implementations** in different migrations

### Testing Checklist Before Production Deployment
- [ ] All migration files reviewed for conflicts
- [ ] Dependency order validated
- [ ] Rollback procedures tested
- [ ] RLS policies verified for data privacy
- [ ] Storage bucket permissions configured correctly
- [ ] Functions tested with sample data
- [ ] Triggers validated for expected behavior
- [ ] Indexes created for query performance
- [ ] Backup created before applying migrations

---

## CONCLUSION

**Current State**: Database has foundation schema (3/26 migrations applied)

**Critical Path**: Resolve subscription schema conflict before proceeding

**Estimated Time to Full Deployment**: 2-3 hours (including testing and validation)

**Risk Level**: Medium-High (due to schema conflicts and incomplete documentation)

**Next Steps**:
1. Resolve subscription migration conflict
2. Apply core feature migrations (Phase 2)
3. Test functionality after each phase
4. Apply social features (Phase 3)
5. Apply AI image generation (Phase 4)
6. Manual migrations and seed data (Phase 5)

---

**Audit Completed By**: Claude Code Database Migration Specialist
**Audit Date**: 2025-11-26
**Review Required**: Project Lead approval needed before production deployment
