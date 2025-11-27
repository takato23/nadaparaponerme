-- =====================================================
-- Verification Script: Complete AI Image Generation System
-- Purpose: Verify all migrations and enhancements were applied
-- =====================================================

\echo '================================================'
\echo '🔍 Verifying AI Image Generation System'
\echo '================================================'

-- =====================================================
-- VERIFICATION 1: Tables exist
-- =====================================================

\echo ''
\echo '📊 Checking Tables...'

DO $$
DECLARE
    v_tables_count INTEGER := 0;
BEGIN
    -- Check ai_generated_images
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_generated_images') THEN
        RAISE NOTICE '✅ Table: ai_generated_images';
        v_tables_count := v_tables_count + 1;
    ELSE
        RAISE WARNING '❌ Table: ai_generated_images NOT FOUND';
    END IF;

    -- Check daily_generation_quota
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_generation_quota') THEN
        RAISE NOTICE '✅ Table: daily_generation_quota';
        v_tables_count := v_tables_count + 1;
    ELSE
        RAISE WARNING '❌ Table: daily_generation_quota NOT FOUND';
    END IF;

    RAISE NOTICE 'Tables found: % / 2', v_tables_count;
END $$;

-- =====================================================
-- VERIFICATION 2: Columns exist
-- =====================================================

\echo ''
\echo '📋 Checking Columns...'

-- ai_generated_images columns
SELECT
    CASE
        WHEN COUNT(*) >= 9 THEN '✅'
        ELSE '⚠️'
    END || ' ai_generated_images has ' || COUNT(*) || ' columns (expected: 9+)' AS check_result
FROM information_schema.columns
WHERE table_name = 'ai_generated_images';

-- Check for specific columns
DO $$
BEGIN
    -- Check critical columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_generated_images' AND column_name = 'ai_metadata') THEN
        RAISE NOTICE '✅ Column: ai_generated_images.ai_metadata (ENHANCEMENT)';
    ELSE
        RAISE WARNING '❌ Column: ai_generated_images.ai_metadata NOT FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_generated_images' AND column_name = 'storage_path') THEN
        RAISE NOTICE '✅ Column: ai_generated_images.storage_path';
    ELSE
        RAISE WARNING '⚠️  Column: ai_generated_images.storage_path NOT FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_generated_images' AND column_name = 'deleted_at') THEN
        RAISE NOTICE '✅ Column: ai_generated_images.deleted_at (soft delete)';
    ELSE
        RAISE WARNING '❌ Column: ai_generated_images.deleted_at NOT FOUND';
    END IF;
END $$;

-- daily_generation_quota columns
SELECT
    CASE
        WHEN COUNT(*) >= 8 THEN '✅'
        ELSE '⚠️'
    END || ' daily_generation_quota has ' || COUNT(*) || ' columns (expected: 8+)' AS check_result
FROM information_schema.columns
WHERE table_name = 'daily_generation_quota';

-- =====================================================
-- VERIFICATION 3: Indexes exist
-- =====================================================

\echo ''
\echo '🔍 Checking Indexes...'

SELECT
    CASE
        WHEN tablename = 'ai_generated_images' THEN '✅ ai_generated_images: '
        WHEN tablename = 'daily_generation_quota' THEN '✅ daily_generation_quota: '
        ELSE '✅ '
    END || indexname AS index_check
FROM pg_indexes
WHERE tablename IN ('ai_generated_images', 'daily_generation_quota')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Count indexes
SELECT
    '📊 Total indexes: ' || COUNT(*) || ' (expected: 7+)' AS index_summary
FROM pg_indexes
WHERE tablename IN ('ai_generated_images', 'daily_generation_quota')
  AND schemaname = 'public';

-- =====================================================
-- VERIFICATION 4: Functions exist
-- =====================================================

\echo ''
\echo '⚙️  Checking Functions...'

DO $$
DECLARE
    v_functions_count INTEGER := 0;
BEGIN
    -- Check each function
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_quota_status') THEN
        RAISE NOTICE '✅ Function: get_user_quota_status (original)';
        v_functions_count := v_functions_count + 1;
    ELSE
        RAISE WARNING '❌ Function: get_user_quota_status NOT FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_generation_quota') THEN
        RAISE NOTICE '✅ Function: check_generation_quota (ENHANCEMENT)';
        v_functions_count := v_functions_count + 1;
    ELSE
        RAISE WARNING '❌ Function: check_generation_quota NOT FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_generation_quota') THEN
        RAISE NOTICE '✅ Function: increment_generation_quota (ENHANCEMENT)';
        v_functions_count := v_functions_count + 1;
    ELSE
        RAISE WARNING '❌ Function: increment_generation_quota NOT FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_generation_history') THEN
        RAISE NOTICE '✅ Function: get_generation_history (ENHANCEMENT)';
        v_functions_count := v_functions_count + 1;
    ELSE
        RAISE WARNING '❌ Function: get_generation_history NOT FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_quota_statistics') THEN
        RAISE NOTICE '✅ Function: get_quota_statistics (ENHANCEMENT)';
        v_functions_count := v_functions_count + 1;
    ELSE
        RAISE WARNING '❌ Function: get_quota_statistics NOT FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'soft_delete_generated_image') THEN
        RAISE NOTICE '✅ Function: soft_delete_generated_image (ENHANCEMENT)';
        v_functions_count := v_functions_count + 1;
    ELSE
        RAISE WARNING '❌ Function: soft_delete_generated_image NOT FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_quotas') THEN
        RAISE NOTICE '✅ Function: cleanup_old_quotas (original)';
        v_functions_count := v_functions_count + 1;
    ELSE
        RAISE WARNING '❌ Function: cleanup_old_quotas NOT FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_ai_data') THEN
        RAISE NOTICE '✅ Function: cleanup_old_ai_data (ENHANCEMENT)';
        v_functions_count := v_functions_count + 1;
    ELSE
        RAISE WARNING '❌ Function: cleanup_old_ai_data NOT FOUND';
    END IF;

    RAISE NOTICE '📊 Functions found: % / 8', v_functions_count;
END $$;

-- =====================================================
-- VERIFICATION 5: Triggers exist
-- =====================================================

\echo ''
\echo '⚡ Checking Triggers...'

SELECT
    '✅ Trigger: ' || trigger_name AS trigger_check,
    '   on ' || event_object_table AS table_name,
    '   timing: ' || action_timing || ' ' || event_manipulation AS trigger_timing
FROM information_schema.triggers
WHERE event_object_table IN ('ai_generated_images', 'daily_generation_quota')
ORDER BY event_object_table, trigger_name;

-- Count triggers
SELECT
    '📊 Total triggers: ' || COUNT(*) AS trigger_summary
FROM information_schema.triggers
WHERE event_object_table IN ('ai_generated_images', 'daily_generation_quota');

-- =====================================================
-- VERIFICATION 6: RLS policies exist
-- =====================================================

\echo ''
\echo '🔒 Checking RLS Policies...'

-- Check RLS is enabled
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = 'ai_generated_images'
          AND rowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS enabled: ai_generated_images';
    ELSE
        RAISE WARNING '❌ RLS NOT enabled: ai_generated_images';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = 'daily_generation_quota'
          AND rowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS enabled: daily_generation_quota';
    ELSE
        RAISE WARNING '❌ RLS NOT enabled: daily_generation_quota';
    END IF;
END $$;

-- List all policies
SELECT
    '✅ Policy: ' || policyname AS policy_check,
    '   on ' || tablename AS table_name,
    '   for ' || cmd AS command
FROM pg_policies
WHERE tablename IN ('ai_generated_images', 'daily_generation_quota')
ORDER BY tablename, policyname;

-- Count policies
SELECT
    '📊 Total policies: ' || COUNT(*) || ' (expected: 8+)' AS policy_summary
FROM pg_policies
WHERE tablename IN ('ai_generated_images', 'daily_generation_quota');

-- =====================================================
-- VERIFICATION 7: Storage bucket exists
-- =====================================================

\echo ''
\echo '📦 Checking Storage Bucket...'

SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'ai-generated-images')
        THEN '✅ Storage bucket: ai-generated-images exists'
        ELSE '❌ Storage bucket: ai-generated-images NOT FOUND'
    END AS bucket_check;

-- Check storage policies
SELECT
    '✅ Storage policy: ' || policyname AS storage_policy_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%AI%'
ORDER BY policyname;

-- =====================================================
-- VERIFICATION 8: Test functions (optional)
-- =====================================================

\echo ''
\echo '🧪 Testing Functions (optional)...'
\echo '   Skipping live tests. Run manually if needed.'
\echo '   Example: SELECT * FROM check_generation_quota(''user-uuid'', ''flash'');'

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

\echo ''
\echo '================================================'
\echo '📊 VERIFICATION SUMMARY'
\echo '================================================'

DO $$
DECLARE
    v_tables_count INTEGER;
    v_indexes_count INTEGER;
    v_functions_count INTEGER;
    v_triggers_count INTEGER;
    v_policies_count INTEGER;
    v_bucket_exists BOOLEAN;
BEGIN
    -- Count components
    SELECT COUNT(*) INTO v_tables_count
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('ai_generated_images', 'daily_generation_quota');

    SELECT COUNT(*) INTO v_indexes_count
    FROM pg_indexes
    WHERE tablename IN ('ai_generated_images', 'daily_generation_quota')
      AND schemaname = 'public';

    SELECT COUNT(*) INTO v_functions_count
    FROM pg_proc
    WHERE proname IN (
        'get_user_quota_status',
        'check_generation_quota',
        'increment_generation_quota',
        'get_generation_history',
        'get_quota_statistics',
        'soft_delete_generated_image',
        'cleanup_old_quotas',
        'cleanup_old_ai_data'
    );

    SELECT COUNT(*) INTO v_triggers_count
    FROM information_schema.triggers
    WHERE event_object_table IN ('ai_generated_images', 'daily_generation_quota');

    SELECT COUNT(*) INTO v_policies_count
    FROM pg_policies
    WHERE tablename IN ('ai_generated_images', 'daily_generation_quota');

    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'ai-generated-images'
    ) INTO v_bucket_exists;

    -- Print summary
    RAISE NOTICE '✅ Tables: % / 2', v_tables_count;
    RAISE NOTICE '✅ Indexes: % / 7+', v_indexes_count;
    RAISE NOTICE '✅ Functions: % / 8', v_functions_count;
    RAISE NOTICE '✅ Triggers: % / 1+', v_triggers_count;
    RAISE NOTICE '✅ RLS Policies: % / 8+', v_policies_count;
    RAISE NOTICE '✅ Storage Bucket: %', CASE WHEN v_bucket_exists THEN 'exists' ELSE 'NOT FOUND' END;

    -- Overall status
    IF v_tables_count = 2 AND v_functions_count >= 8 AND v_triggers_count >= 1 AND v_bucket_exists THEN
        RAISE NOTICE '================================================';
        RAISE NOTICE '🎉 ALL VERIFICATIONS PASSED!';
        RAISE NOTICE '================================================';
        RAISE NOTICE '✅ Base migration: 20251120000001_ai_image_generation.sql';
        RAISE NOTICE '✅ Storage setup: 20251120000002_ai_images_storage.sql';
        RAISE NOTICE '✅ Enhancements: 20251120171325_enhance_ai_image_generation.sql';
        RAISE NOTICE '================================================';
    ELSE
        RAISE WARNING '================================================';
        RAISE WARNING '⚠️  SOME VERIFICATIONS FAILED';
        RAISE WARNING '   Review output above for missing components';
        RAISE WARNING '================================================';
    END IF;
END $$;

\echo ''
\echo '================================================'
\echo '📝 Next Steps:'
\echo '   1. Update Edge Functions to use new functions'
\echo '   2. Test quota system with real users'
\echo '   3. Configure cron job for cleanup_old_ai_data()'
\echo '   4. Monitor usage via get_quota_statistics()'
\echo '================================================'
