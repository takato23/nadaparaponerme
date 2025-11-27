# AI Image Generation System - Complete Documentation

## Overview

Complete system for AI-generated clothing images using Google's Gemini AI (via Google AI Studio free tier) with built-in rate limiting, quota management, and comprehensive analytics.

### Features

- **Two core tables**: `ai_generated_images` (storage) and `daily_generation_quota` (rate limiting)
- **8 utility functions**: Quota checking, history tracking, statistics, and cleanup
- **Automatic quota management**: Daily resets and usage tracking with subscription tiers
- **RLS policies**: Row-level security for data privacy
- **Storage integration**: Private bucket for generated images
- **Soft deletes**: Preserve data with `deleted_at` timestamps
- **Subscription tiers**: Free (10/day), Pro (50 flash + 5 pro), Premium (200 flash + 20 pro)
- **Model tracking**: Separate quotas for 'flash' (fast) and 'pro' (premium) models

## Migration Files

### Base System (Already Applied)
- **`20251120000001_ai_image_generation.sql`**: Core tables, functions, RLS policies
- **`20251120000002_ai_images_storage.sql`**: Storage bucket and policies

### Enhancement Migration (NEW)
- **`20251120171325_enhance_ai_image_generation.sql`**: 9 enhancements to existing system
- **`verify_ai_image_generation.sql`**: Comprehensive verification script

## Execution Instructions

### 1. Check Current Status

```bash
# Check if base migrations are already applied
supabase db dump --schema public | grep ai_generated_images
```

### 2. Apply Enhancement Migration

```bash
# From project root
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme

# Push enhancement migration to Supabase
supabase db push
```

### 3. Verify Complete System

```bash
# Run comprehensive verification script
supabase db execute --file supabase/migrations/verify_ai_image_generation.sql
```

Expected output:
```
================================================
🔍 Verifying AI Image Generation System
================================================

📊 Checking Tables...
✅ Table: ai_generated_images
✅ Table: daily_generation_quota
Tables found: 2 / 2

📋 Checking Columns...
✅ ai_generated_images has 10 columns (expected: 9+)
✅ Column: ai_generated_images.ai_metadata (ENHANCEMENT)
✅ Column: ai_generated_images.storage_path
✅ Column: ai_generated_images.deleted_at (soft delete)

⚙️  Checking Functions...
✅ Function: get_user_quota_status (original)
✅ Function: check_generation_quota (ENHANCEMENT)
✅ Function: increment_generation_quota (ENHANCEMENT)
✅ Function: get_generation_history (ENHANCEMENT)
✅ Function: get_quota_statistics (ENHANCEMENT)
✅ Function: soft_delete_generated_image (ENHANCEMENT)
✅ Function: cleanup_old_quotas (original)
✅ Function: cleanup_old_ai_data (ENHANCEMENT)
📊 Functions found: 8 / 8

================================================
🎉 ALL VERIFICATIONS PASSED!
================================================
```

### 3. Test Quota System

```sql
-- Check quota for user (returns current usage and limits)
SELECT * FROM check_generation_quota('user-uuid-here');

-- Insert test image (will trigger quota increment)
INSERT INTO ai_generated_images (user_id, prompt, image_url, model_used, generation_time_ms)
VALUES (
  'user-uuid-here',
  'Black leather jacket',
  'https://storage.supabase.co/...',
  'flash',
  1234
);

-- Verify quota was incremented
SELECT * FROM daily_generation_quota WHERE user_id = 'user-uuid-here';
```

## Database Schema

### Table: ai_generated_images

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References profiles(id) |
| prompt | TEXT | User's generation prompt |
| image_url | TEXT | Supabase Storage URL |
| model_used | TEXT | 'flash' or 'pro' |
| generation_time_ms | INTEGER | Generation time in ms |
| created_at | TIMESTAMPTZ | Creation timestamp |

### Table: daily_generation_quota

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References profiles(id) |
| date | DATE | Quota date |
| flash_count | INTEGER | Flash model usage count |
| pro_count | INTEGER | Pro model usage count |
| plan_type | TEXT | 'free', 'pro', 'premium' |
| last_reset_at | TIMESTAMPTZ | Last reset timestamp |

**Constraints:**
- UNIQUE(user_id, date): One quota record per user per day
- CHECK(flash_count + pro_count <= 10): Free tier limit

## Functions

### check_generation_quota(user_id, model_used) - ENHANCED

Enhanced quota checking with auto-creation and next reset time.

**Usage:**
```sql
SELECT * FROM check_generation_quota('user-uuid', 'flash');
```

**Returns:**
| Column | Type | Description |
|--------|------|-------------|
| can_generate | BOOLEAN | True if quota available |
| current_count | INTEGER | Generations today for this model |
| daily_limit | INTEGER | Max allowed for this plan |
| remaining_quota | INTEGER | Remaining generations |
| plan_type | TEXT | User's plan type |
| next_reset_at | TIMESTAMPTZ | When quota resets (midnight) |

### increment_generation_quota(user_id, model_used, plan_type) - NEW

Manually increment quota counter with validation.

**Usage:**
```sql
SELECT * FROM increment_generation_quota('user-uuid', 'flash', 'free');
```

**Returns:**
| Column | Type | Description |
|--------|------|-------------|
| success | BOOLEAN | True if increment successful |
| new_count | INTEGER | Updated count |
| remaining_quota | INTEGER | Remaining generations |
| message | TEXT | Status message |

### get_generation_history(user_id, limit, offset) - NEW

Retrieve paginated generation history for a user.

**Usage:**
```sql
SELECT * FROM get_generation_history('user-uuid', 20, 0);
```

**Returns:** Array of generated images with metadata

### get_quota_statistics(user_id, days) - NEW

Get usage statistics for the past N days.

**Usage:**
```sql
SELECT * FROM get_quota_statistics('user-uuid', 7);
```

**Returns:**
| Column | Type | Description |
|--------|------|-------------|
| date | DATE | Usage date |
| flash_count | INTEGER | Flash generations |
| pro_count | INTEGER | Pro generations |
| total_count | INTEGER | Total generations |
| plan_type | TEXT | User's plan on that date |

### soft_delete_generated_image(image_id, user_id) - NEW

Soft delete a generated image (sets `deleted_at` timestamp).

**Usage:**
```sql
SELECT soft_delete_generated_image('image-uuid', 'user-uuid');
```

**Returns:** BOOLEAN (true if deleted successfully)

### reset_daily_quota()

Automatically resets counters when a new day starts. Triggered BEFORE INSERT on `ai_generated_images`.

### increment_generation_count()

Automatically increments usage counter after successful generation. Triggered AFTER INSERT on `ai_generated_images`.

### cleanup_old_quota_records()

Removes quota records older than 90 days (optional cleanup).

**Usage:**
```sql
SELECT cleanup_old_quota_records();
```

## RLS Policies

### ai_generated_images

- **Users can insert own images**: Authenticated users can INSERT their own images
- **Users can select own images**: Authenticated users can SELECT their own images
- **Service role can select all**: Service role has full SELECT access
- **Service role can update all**: Service role has full UPDATE access

### daily_generation_quota

- **Users can select own quota**: Authenticated users can view their quota
- **Users can insert own quota**: Auto-creation on first generation
- **Service role can insert/update**: Full access for quota management

## Integration with Edge Functions

### Before Image Generation

```typescript
// Check quota before generating
const { data: quota } = await supabase.rpc('check_generation_quota', {
  p_user_id: user.id,
  p_model_used: 'flash'
});

if (!quota.can_generate) {
  throw new Error('Daily generation limit reached');
}

// Generate image...
const imageUrl = await generateImage(prompt);

// Store result (triggers quota increment)
const { data: image } = await supabase
  .from('ai_generated_images')
  .insert({
    user_id: user.id,
    prompt: prompt,
    image_url: imageUrl,
    model_used: 'flash',
    generation_time_ms: generationTime
  })
  .select()
  .single();
```

### Display Quota to User

```typescript
// Get current quota status
const { data: quota } = await supabase.rpc('check_generation_quota', {
  p_user_id: user.id
});

console.log(`Images today: ${quota.total_count} / 10`);
console.log(`Remaining: ${10 - quota.total_count}`);
```

## Rate Limiting Tiers

| Plan Type | Flash Limit | Pro Limit | Total Daily Limit |
|-----------|-------------|-----------|-------------------|
| Free | Unlimited | Unlimited | 10 images |
| Pro | Unlimited | Unlimited | 100 images |
| Premium | Unlimited | Unlimited | Unlimited |

**Note**: Google AI Studio provides 500 images/day for free across all users. Adjust plan limits accordingly.

## Troubleshooting

### Issue: "relation 'profiles' does not exist"

**Solution**: Ensure the `profiles` table exists before running this migration. Run user profile migrations first.

### Issue: RLS policies not working

**Solution**: Verify RLS is enabled:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('ai_generated_images', 'daily_generation_quota');
```

### Issue: Quota not incrementing

**Solution**: Check triggers are active:
```sql
SELECT trigger_name, event_object_table, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'ai_generated_images';
```

### Issue: Free tier limit not enforced

**Solution**: Verify constraint:
```sql
SELECT conname, consrc
FROM pg_constraint
WHERE conrelid = 'daily_generation_quota'::regclass
  AND conname = 'free_tier_limit';
```

## Maintenance

### Clean up old quota records

```bash
# Run monthly via cron job
supabase db execute --sql "SELECT cleanup_old_quota_records();"
```

### Monitor usage

```sql
-- Top users by generation count
SELECT
  user_id,
  SUM(flash_count + pro_count) AS total_generations,
  plan_type
FROM daily_generation_quota
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, plan_type
ORDER BY total_generations DESC
LIMIT 20;

-- Daily generation trends
SELECT
  date,
  SUM(flash_count) AS flash_total,
  SUM(pro_count) AS pro_total,
  SUM(flash_count + pro_count) AS total
FROM daily_generation_quota
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;
```

## Next Steps

1. **Create Edge Function**: `supabase/functions/generate-image/index.ts`
2. **Update Frontend**: Add image generation UI component
3. **Add Types**: Update `src/types/api.ts` with new table types
4. **Test Quota**: Verify rate limiting works correctly
5. **Monitor Usage**: Set up analytics for generation metrics

## References

- **Google AI Studio**: https://aistudio.google.com
- **Gemini API Docs**: https://ai.google.dev/docs
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Migration Guide**: See project CLAUDE.md for migration best practices
