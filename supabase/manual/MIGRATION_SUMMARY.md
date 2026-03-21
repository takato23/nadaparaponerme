# AI Image Generation System - Migration Summary

## Executive Summary

Complete database migration for AI-generated clothing images using Google's Gemini AI with rate limiting, quota management, and comprehensive analytics.

## Migration Status

### ✅ Already Applied (Base System)
1. **`20251120000001_ai_image_generation.sql`**
   - Core tables: `ai_generated_images`, `daily_generation_quota`
   - Basic functions: `get_user_quota_status`, `cleanup_old_quotas`
   - RLS policies for data privacy
   - Subscription tier integration

2. **`20251120000002_ai_images_storage.sql`**
   - Storage bucket: `ai-generated-images` (private, 2MB limit)
   - Storage RLS policies

### 🆕 NEW Enhancement Migration
3. **`20251120171325_enhance_ai_image_generation.sql`**
   - **Enhancement 1**: Added `ai_metadata` JSONB column for extensibility
   - **Enhancement 2**: Enhanced `check_generation_quota()` with next reset time
   - **Enhancement 3**: New `increment_generation_quota()` function with validation
   - **Enhancement 4**: New `get_generation_history()` for paginated history
   - **Enhancement 5**: New `get_quota_statistics()` for usage analytics
   - **Enhancement 6**: New `soft_delete_generated_image()` for soft deletes
   - **Enhancement 7**: Performance indexes (GIN for JSONB, deleted_at)
   - **Enhancement 8**: RLS policy for service role INSERT operations
   - **Enhancement 9**: Enhanced `cleanup_old_ai_data()` with logging

## Quick Start

### Step 1: Apply Enhancement Migration
```bash
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme
supabase db push
```

### Step 2: Verify Installation
```bash
supabase db execute --file supabase/migrations/verify_ai_image_generation.sql
```

### Step 3: Test Functions
```sql
-- Check quota for a user
SELECT * FROM check_generation_quota('user-uuid', 'flash');

-- Get usage statistics
SELECT * FROM get_quota_statistics('user-uuid', 7);

-- Get generation history
SELECT * FROM get_generation_history('user-uuid', 20, 0);
```

## System Components

### Tables (2)
| Table | Purpose | Key Features |
|-------|---------|--------------|
| `ai_generated_images` | Store generated images | 10 columns, soft deletes, JSONB metadata |
| `daily_generation_quota` | Rate limiting | Per-model tracking, subscription tiers |

### Functions (8)
| Function | Type | Purpose |
|----------|------|---------|
| `get_user_quota_status` | Original | Legacy quota check |
| `check_generation_quota` | **Enhanced** | Quota check with reset time |
| `increment_generation_quota` | **NEW** | Manual quota increment |
| `get_generation_history` | **NEW** | Paginated image history |
| `get_quota_statistics` | **NEW** | Usage analytics (7-day) |
| `soft_delete_generated_image` | **NEW** | Soft delete images |
| `cleanup_old_quotas` | Original | Remove quota >30 days |
| `cleanup_old_ai_data` | **Enhanced** | Enhanced cleanup with logging |

### Indexes (7+)
- User ID and creation date (ai_generated_images)
- User ID and date (daily_generation_quota)
- Model type filtering
- **NEW**: GIN index for JSONB metadata
- **NEW**: deleted_at filtering index

### RLS Policies (8+)
- User data privacy (SELECT, INSERT, UPDATE own data)
- Service role full access
- Storage bucket policies

## Subscription Tiers

| Tier | Flash Model | Pro Model | Total Daily |
|------|-------------|-----------|-------------|
| **Free** | 10 | 0 | 10 images |
| **Pro** | 50 | 5 | 55 images |
| **Premium** | 200 | 20 | 220 images |

## Key Improvements

### 1. Enhanced Quota System
- Next reset time in quota response
- Auto-creation of quota records
- Separate tracking for flash and pro models
- Subscription tier validation

### 2. User Experience
- Paginated generation history
- 7-day usage statistics
- Soft delete (preserve user data)
- Rich metadata storage (colors, tags, style)

### 3. Performance
- GIN index for JSONB queries
- Optimized deleted_at filtering
- Efficient pagination in history queries

### 4. Developer Experience
- 8 comprehensive utility functions
- Clear error messages
- Validation at database level
- Type-safe JSONB metadata

## Integration Example

```typescript
// 1. Check quota before generation
const { data: quota } = await supabase.rpc('check_generation_quota', {
  p_user_id: userId,
  p_model_type: 'flash'
});

if (!quota.can_generate) {
  const resetTime = new Date(quota.next_reset_at);
  throw new Error(`Limit reached. Resets at ${resetTime}`);
}

// 2. Generate image with Gemini AI
const imageUrl = await generateImageWithGemini(prompt);

// 3. Store result with metadata
const { data: image } = await supabase
  .from('ai_generated_images')
  .insert({
    user_id: userId,
    prompt: prompt,
    image_url: imageUrl,
    storage_path: `${userId}/${imageId}.png`,
    model_type: 'flash',
    generation_time_ms: 1234,
    ai_metadata: {
      colors: ['#000000', '#FFFFFF'],
      tags: ['casual', 'modern'],
      style: 'minimalist'
    }
  })
  .select()
  .single();

// 4. Show usage statistics
const { data: stats } = await supabase.rpc('get_quota_statistics', {
  p_user_id: userId,
  p_days: 7
});
```

## Monitoring & Maintenance

### Daily Monitoring
```sql
-- Check overall usage
SELECT
  COUNT(*) AS total_images,
  SUM(generation_time_ms) / 1000 AS total_seconds,
  AVG(generation_time_ms) AS avg_time_ms
FROM ai_generated_images
WHERE created_at >= CURRENT_DATE;
```

### Weekly Cleanup (Cron Job)
```bash
# Run every Sunday at 2 AM
0 2 * * 0 supabase db execute --sql "SELECT cleanup_old_ai_data();"
```

### Top Users
```sql
-- Find power users
SELECT
  user_id,
  SUM(flash_count + pro_count) AS total_generations,
  plan_type
FROM daily_generation_quota
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, plan_type
ORDER BY total_generations DESC
LIMIT 10;
```

## Troubleshooting

### Issue: Quota not incrementing
**Solution**: Check triggers are enabled
```sql
SELECT * FROM information_schema.triggers
WHERE event_object_table = 'ai_generated_images';
```

### Issue: RLS blocking queries
**Solution**: Verify user authentication
```sql
SELECT auth.uid(); -- Should return current user ID
```

### Issue: Storage upload failing
**Solution**: Check bucket permissions
```sql
SELECT * FROM storage.buckets WHERE id = 'ai-generated-images';
```

## Next Steps

1. **Edge Function**: Create `supabase/functions/generate-image/index.ts`
2. **Frontend UI**: Add image generation component
3. **TypeScript Types**: Update `src/types/api.ts` with new table types
4. **Testing**: Test quota system with real users
5. **Analytics**: Set up monitoring dashboard
6. **Cron Job**: Configure automated cleanup

## Resources

- **Full Documentation**: `README_AI_IMAGE_GENERATION.md`
- **Verification Script**: `verify_ai_image_generation.sql`
- **Base Migration 1**: `20251120000001_ai_image_generation.sql`
- **Base Migration 2**: `20251120000002_ai_images_storage.sql`
- **Enhancement Migration**: `20251120171325_enhance_ai_image_generation.sql`

## Support

For issues or questions:
1. Check verification script output
2. Review function definitions in migration files
3. Consult full documentation in README_AI_IMAGE_GENERATION.md
4. Test functions manually with sample UUIDs

---

**Migration Created**: 2025-11-20
**Status**: Ready for deployment
**Compatibility**: PostgreSQL 12+, Supabase Edge Functions
**Dependencies**: `profiles` table, `subscriptions` table
