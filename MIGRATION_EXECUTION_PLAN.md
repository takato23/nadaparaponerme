# MIGRATION EXECUTION PLAN
**Project**: No Tengo Nada Para Ponerme
**Date**: 2025-11-26
**Prepared By**: Database Migration Specialist

---

## QUICK START

### 1. Verify Current State (5 minutes)
```bash
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme

# Option A: Run verification script in Supabase SQL Editor
# Copy contents of: supabase/migrations/VERIFY_DATABASE_STATE.sql
# Paste into: https://supabase.com/dashboard/project/{YOUR_PROJECT_ID}/sql/new
# Click "Run"

# Option B: Quick check via CLI (if Supabase CLI is set up)
supabase db diff
```

### 2. Resolve Conflicts (15 minutes)
**CRITICAL**: Choose ONE subscription schema design

#### Option A: Use Comprehensive Schema (RECOMMENDED)
```bash
# Delete conflicting files
rm supabase/migrations/20251119000008_subscriptions.sql
rm supabase/migrations/20251119000009_fix_payment_schema.sql

# Keep this file:
# ✅ supabase/migrations/20250101000008_subscriptions_and_payments.sql
```

#### Option B: Use Stripe-Only Schema
```bash
# Delete comprehensive schema
rm supabase/migrations/20250101000008_subscriptions_and_payments.sql

# Keep these files:
# ✅ supabase/migrations/20251119000008_subscriptions.sql
# ✅ supabase/migrations/20251119000009_fix_payment_schema.sql
```

### 3. Apply Migrations (30-45 minutes)
```bash
# Push all pending migrations
supabase db push

# This will apply migrations in chronological order
```

### 4. Run Manual Migrations (10 minutes)
```bash
# Open Supabase SQL Editor
# https://supabase.com/dashboard/project/{YOUR_PROJECT_ID}/sql/new

# Copy and run: supabase/migrations/apply_style_challenges.sql
# (Only if style_challenges table exists)

# Copy and run: supabase/migrations/MANUAL_RUN_subscriptions_and_payments.sql
# (Only if needed for MercadoPago migration)
```

### 5. Verify Success (5 minutes)
```bash
# Run verification script again
# Compare results with expected tables in DATABASE_MIGRATION_AUDIT.md
```

**Total Time**: ~1-1.5 hours

---

## DETAILED EXECUTION STEPS

### PHASE 1: PRE-FLIGHT CHECKS

#### Step 1.1: Backup Current Database
```bash
# Create backup before making changes
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Step 1.2: Check Supabase CLI Version
```bash
supabase --version
# Should be v1.0.0 or higher
```

#### Step 1.3: Verify Connection
```bash
supabase status
# Should show "API URL", "DB URL", etc.
```

#### Step 1.4: Run Current State Verification
```sql
-- In Supabase SQL Editor, run:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected base tables (if already applied):
-- activity_feed
-- borrowed_items
-- clothing_items
-- friendships
-- outfit_comments
-- outfit_likes
-- outfits
-- packing_lists
-- profiles
```

---

### PHASE 2: CONFLICT RESOLUTION

#### Step 2.1: Identify Subscription Schema in Use
```sql
-- Run in Supabase SQL Editor
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'subscriptions'
  AND tc.constraint_type = 'FOREIGN KEY';

-- If result shows foreign_table_name = 'profiles': Use Option A
-- If result shows foreign_table_name = 'users': Use Option B
-- If no results: Table doesn't exist, choose Option A (recommended)
```

#### Step 2.2: Delete Conflicting Files
Based on Step 2.1 results:

**If choosing Option A (profiles-based, MercadoPago support):**
```bash
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme/supabase/migrations

# Delete conflicting files
rm 20251119000008_subscriptions.sql
rm 20251119000009_fix_payment_schema.sql

# Verify deletion
ls -la | grep subscriptions
# Should only show: 20250101000008_subscriptions_and_payments.sql
```

**If choosing Option B (auth.users-based, Stripe-only):**
```bash
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme/supabase/migrations

# Delete comprehensive schema
rm 20250101000008_subscriptions_and_payments.sql

# Verify deletion
ls -la | grep subscriptions
# Should show: 20251119000008_subscriptions.sql and 20251119000009_fix_payment_schema.sql
```

#### Step 2.3: Clean Up Obsolete Files (Optional)
```bash
# Delete DEPLOY_ALL_PENDING.sql (doesn't contain executable SQL)
rm DEPLOY_ALL_PENDING.sql

# Or update it with proper content (advanced)
```

---

### PHASE 3: MIGRATION EXECUTION

#### Step 3.1: Test on Local Database (RECOMMENDED)
```bash
# If using Supabase local development
supabase start

# Apply migrations locally first
supabase db push --local

# Verify
supabase db diff --local

# If successful, proceed to production
supabase stop
```

#### Step 3.2: Apply All Pending Migrations
```bash
# Navigate to project root
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme

# Push all migrations to remote database
supabase db push

# Expected output:
# Applying migration 20250101000004_outfit_schedule.sql...
# Applying migration 20250101000005_style_challenges.sql...
# Applying migration 20250101000006_outfit_ratings.sql...
# ... (continues for all pending migrations)
```

#### Step 3.3: Monitor for Errors
```bash
# If error occurs during push, note the migration file name
# Example error: "relation 'subscriptions' does not exist"
# This indicates a dependency issue

# To fix:
# 1. Check which migration failed
# 2. Verify dependencies exist
# 3. Apply missing dependency migration first
# 4. Retry push
```

---

### PHASE 4: MANUAL MIGRATIONS

#### Step 4.1: Apply Style Challenges Seed Data
```bash
# Open Supabase SQL Editor
# https://supabase.com/dashboard/project/{YOUR_PROJECT_ID}/sql/new

# Copy contents of:
cat supabase/migrations/apply_style_challenges.sql

# Paste into SQL Editor
# Click "Run"

# Expected result: "X rows inserted into style_challenges"
```

#### Step 4.2: Apply MercadoPago Migration (If Needed)
```sql
-- Only run this if you chose Option A subscription schema
-- AND need to migrate existing subscriptions to MercadoPago support

-- Open Supabase SQL Editor
-- Copy contents of: supabase/migrations/MANUAL_RUN_subscriptions_and_payments.sql
-- Click "Run"

-- IMPORTANT: This migration:
-- 1. Creates new tables: payment_transactions, payment_methods
-- 2. Migrates existing subscription data
-- 3. Adds MercadoPago support columns
```

#### Step 4.3: Fix Storage Permissions (If Needed)
```bash
# If clothing-images bucket should be public:
supabase db push fix_clothing_images_public.sql

# Or run in SQL Editor:
UPDATE storage.buckets
SET public = true
WHERE id = 'clothing-images';
```

---

### PHASE 5: POST-MIGRATION VERIFICATION

#### Step 5.1: Run Full Verification Script
```sql
-- In Supabase SQL Editor, run:
-- Copy entire contents of: supabase/migrations/VERIFY_DATABASE_STATE.sql
-- Paste and execute

-- Review output sections:
-- 1. ALL TABLES - Should show 20+ tables
-- 2. RLS POLICIES - Should show 35+ policies
-- 3. TRIGGERS - Should show 11+ triggers
-- 4. FUNCTIONS - Should show 10+ custom functions
-- 5. STORAGE BUCKETS - Should show 4 buckets
-- 6. MIGRATION STATUS - All should be ✅
```

#### Step 5.2: Test Core Functionality
```sql
-- Test profile creation
SELECT * FROM profiles LIMIT 5;

-- Test subscription system
SELECT * FROM subscriptions LIMIT 5;

-- Test AI quota system (if applied)
SELECT * FROM daily_generation_quota LIMIT 5;

-- Test RLS policies (should only show current user's data)
SELECT * FROM clothing_items LIMIT 10;
```

#### Step 5.3: Verify Function Availability
```sql
-- Test quota function (if AI images migration applied)
SELECT * FROM get_user_quota_status(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'flash'
);

-- Test subscription function
SELECT * FROM user_has_feature_access(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'ai_designer'
);
```

#### Step 5.4: Check for Missing Dependencies
```sql
-- List all foreign key violations (should be empty)
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = ccu.table_name
  );
```

---

### PHASE 6: ROLLBACK (IF NEEDED)

#### Option 1: Rollback Single Migration
```bash
# Create down migration file
# Example: supabase/migrations/20250101000009_rollback_ai_images.sql

DROP TRIGGER IF EXISTS trigger_update_quota_timestamp ON daily_generation_quota;
DROP FUNCTION IF EXISTS update_quota_timestamp();
DROP FUNCTION IF EXISTS cleanup_old_quotas();
DROP TABLE IF EXISTS ai_generated_images CASCADE;
DROP TABLE IF EXISTS daily_generation_quota CASCADE;

# Apply rollback
supabase db push
```

#### Option 2: Reset to Base Schema
```bash
# WARNING: This deletes ALL data and ALL migrations
supabase db reset

# Re-apply only base migrations
supabase db push 20250101000001_initial_schema.sql
supabase db push 20250101000002_triggers_and_rls.sql
supabase db push 20250101000003_storage_setup.sql
```

#### Option 3: Restore from Backup
```bash
# List backups
ls -la backup_*.sql

# Restore specific backup
supabase db reset
psql $DATABASE_URL < backup_20251126_143000.sql
```

---

## EXPECTED FINAL STATE

### Tables (30 total)
```
Base Schema (9):
✅ profiles
✅ clothing_items
✅ outfits
✅ friendships
✅ outfit_likes
✅ outfit_comments
✅ borrowed_items
✅ packing_lists
✅ activity_feed

Core Features (5):
✅ outfit_schedules
✅ style_challenges
✅ challenge_participations
✅ outfit_ratings
✅ closet_gap_analysis

Payments (4):
✅ subscriptions
✅ payment_transactions
✅ payment_methods
✅ usage_metrics

Multiplayer (5):
✅ multiplayer_challenges
✅ challenge_teams
✅ team_members
✅ challenge_submissions
✅ challenge_votes

Social (4):
✅ close_friends
✅ suggested_users
✅ communities
✅ community_members

AI Features (2):
✅ ai_generated_images
✅ daily_generation_quota
```

### Functions (10+)
```
✅ check_generation_quota
✅ cleanup_old_ai_data
✅ cleanup_old_quotas
✅ get_generation_history
✅ get_quota_statistics
✅ get_user_quota_status
✅ increment_ai_generation_usage
✅ increment_generation_quota
✅ soft_delete_generated_image
✅ update_outfit_comments_count
✅ update_outfit_likes_count
✅ update_updated_at
✅ user_has_feature_access
```

### Storage Buckets (4)
```
✅ ai-generated-images (private, 2MB limit)
✅ avatars (public)
✅ clothing-images (private/public - depends on config)
✅ outfit-shares (public)
```

### RLS Policies (35+)
All tables should have appropriate SELECT, INSERT, UPDATE, DELETE policies

---

## TROUBLESHOOTING

### Error: "relation does not exist"
**Cause**: Dependency migration not applied
**Fix**: Apply missing dependency first, then retry

### Error: "duplicate key value violates unique constraint"
**Cause**: Migration already partially applied
**Fix**: Check current state, skip duplicate inserts, or rollback and retry

### Error: "permission denied for table"
**Cause**: RLS policy blocking operation
**Fix**: Verify user authentication, check RLS policies

### Error: "function does not exist"
**Cause**: Function migration not applied
**Fix**: Apply function migration, verify signature matches call

### Warning: "relation already exists"
**Cause**: Table already created (possibly by conflicting migration)
**Fix**: Use DROP TABLE IF EXISTS or skip migration

---

## SUCCESS CRITERIA

- [ ] All 30 expected tables exist
- [ ] All 35+ RLS policies active
- [ ] All 10+ custom functions available
- [ ] All 4 storage buckets configured
- [ ] No foreign key violations
- [ ] No trigger errors
- [ ] Verification script runs without errors
- [ ] Sample queries return expected results
- [ ] No conflict between subscription schemas
- [ ] Manual migrations applied where needed

---

## NEXT STEPS AFTER MIGRATION

1. **Update TypeScript Types**
   - Run: `supabase gen types typescript --local > src/types/database.types.ts`
   - Update `src/types/api.ts` with new table interfaces

2. **Deploy Edge Functions**
   ```bash
   supabase functions deploy analyze-clothing
   supabase functions deploy generate-outfit
   supabase functions deploy generate-packing-list
   ```

3. **Test Frontend Integration**
   - Verify closet loading works
   - Test outfit generation
   - Check subscription access control
   - Validate AI image generation (if implemented)

4. **Configure Cron Jobs**
   - Set up daily quota cleanup
   - Configure usage analytics aggregation

5. **Monitor Production**
   - Watch for RLS policy violations
   - Monitor function execution times
   - Check storage usage

---

**Prepared By**: Database Migration Specialist
**Review Required**: Yes - verify conflict resolution before production deployment
**Estimated Duration**: 1-1.5 hours total
**Risk Level**: Medium (due to schema conflicts)
