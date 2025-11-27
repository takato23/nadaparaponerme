-- =====================================================
-- VERIFY DATABASE STATE
-- Comprehensive verification script for migration status
-- Run in Supabase SQL Editor to check current state
-- =====================================================

-- =====================================================
-- 1. LIST ALL TABLES
-- =====================================================
SELECT
  '=== ALL TABLES ===' AS section,
  NULL::TEXT AS table_name,
  NULL::INTEGER AS row_count,
  NULL::TEXT AS status
UNION ALL
SELECT
  'table' AS section,
  table_name,
  NULL::INTEGER AS row_count,
  CASE
    WHEN table_name IN ('profiles', 'clothing_items', 'outfits', 'friendships', 'outfit_likes', 'outfit_comments', 'borrowed_items', 'packing_lists', 'activity_feed')
      THEN '✅ Base Schema'
    WHEN table_name IN ('outfit_schedules', 'style_challenges', 'challenge_participations', 'outfit_ratings', 'closet_gap_analysis')
      THEN '⏳ Core Features'
    WHEN table_name IN ('subscriptions', 'payment_transactions', 'payment_methods', 'usage_metrics', 'payment_history')
      THEN '💳 Payments'
    WHEN table_name IN ('multiplayer_challenges', 'challenge_teams', 'team_members', 'challenge_submissions', 'challenge_votes')
      THEN '🎮 Multiplayer'
    WHEN table_name IN ('close_friends', 'suggested_users', 'communities', 'community_members')
      THEN '👥 Social'
    WHEN table_name IN ('ai_generated_images', 'daily_generation_quota')
      THEN '🎨 AI Images'
    ELSE '❓ Unknown'
  END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY
  CASE section WHEN '=== ALL TABLES ===' THEN 0 ELSE 1 END,
  status,
  table_name;

-- =====================================================
-- 2. ROW COUNTS FOR EACH TABLE
-- =====================================================
SELECT '=== ROW COUNTS ===' AS info;

DO $$
DECLARE
  r RECORD;
  v_count INTEGER;
  v_query TEXT;
BEGIN
  FOR r IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    v_query := 'SELECT COUNT(*) FROM public.' || quote_ident(r.table_name);
    EXECUTE v_query INTO v_count;
    RAISE NOTICE '% rows in %', v_count, r.table_name;
  END LOOP;
END $$;

-- =====================================================
-- 3. RLS POLICIES COUNT
-- =====================================================
SELECT
  '=== RLS POLICIES ===' AS section,
  schemaname,
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
UNION ALL
SELECT
  '=== TOTAL ===' AS section,
  NULL AS schemaname,
  NULL AS tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY section DESC, tablename;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================
SELECT
  '=== TRIGGERS ===' AS section,
  event_object_table AS table_name,
  trigger_name,
  event_manipulation,
  LEFT(action_statement, 50) AS action_preview
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- 5. CUSTOM FUNCTIONS
-- =====================================================
SELECT
  '=== FUNCTIONS ===' AS section,
  routine_name,
  routine_type,
  data_type AS return_type,
  CASE
    WHEN routine_name LIKE '%quota%' THEN '🎨 AI Quota'
    WHEN routine_name LIKE '%subscription%' THEN '💳 Subscriptions'
    WHEN routine_name LIKE '%outfit%' THEN '👔 Outfits'
    WHEN routine_name LIKE '%update%' THEN '🔄 Auto-Update'
    ELSE '❓ Other'
  END AS category
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name NOT LIKE 'pg_%'
ORDER BY category, routine_name;

-- =====================================================
-- 6. STORAGE BUCKETS
-- =====================================================
SELECT
  '=== STORAGE BUCKETS ===' AS section,
  id,
  name,
  public,
  file_size_limit,
  CASE
    WHEN public THEN '🌍 Public'
    ELSE '🔒 Private'
  END AS access_level
FROM storage.buckets
ORDER BY name;

-- =====================================================
-- 7. INDEXES
-- =====================================================
SELECT
  '=== INDEXES ===' AS section,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =====================================================
-- 8. FOREIGN KEY CONSTRAINTS
-- =====================================================
SELECT
  '=== FOREIGN KEYS ===' AS section,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- 9. CHECK CONSTRAINTS
-- =====================================================
SELECT
  '=== CHECK CONSTRAINTS ===' AS section,
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- 10. MIGRATION COMPLETENESS CHECK
-- =====================================================
SELECT '=== MIGRATION STATUS ===' AS section;

-- Base Schema (SHOULD BE PRESENT)
SELECT
  'Base Schema' AS migration_group,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN '✅ profiles'
    ELSE '❌ profiles MISSING'
  END AS status
UNION ALL
SELECT 'Base Schema', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clothing_items') THEN '✅ clothing_items' ELSE '❌ clothing_items MISSING' END
UNION ALL
SELECT 'Base Schema', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outfits') THEN '✅ outfits' ELSE '❌ outfits MISSING' END
UNION ALL
SELECT 'Base Schema', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friendships') THEN '✅ friendships' ELSE '❌ friendships MISSING' END

-- Core Features (MAY BE PENDING)
UNION ALL
SELECT 'Core Features', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outfit_schedules') THEN '✅ outfit_schedules' ELSE '⏳ outfit_schedules PENDING' END
UNION ALL
SELECT 'Core Features', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'style_challenges') THEN '✅ style_challenges' ELSE '⏳ style_challenges PENDING' END
UNION ALL
SELECT 'Core Features', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outfit_ratings') THEN '✅ outfit_ratings' ELSE '⏳ outfit_ratings PENDING' END
UNION ALL
SELECT 'Core Features', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'closet_gap_analysis') THEN '✅ closet_gap_analysis' ELSE '⏳ closet_gap_analysis PENDING' END

-- Payments System
UNION ALL
SELECT 'Payments', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN '✅ subscriptions' ELSE '⏳ subscriptions PENDING' END
UNION ALL
SELECT 'Payments', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN '✅ payment_transactions' ELSE '⏳ payment_transactions PENDING' END
UNION ALL
SELECT 'Payments', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_metrics') THEN '✅ usage_metrics' ELSE '⏳ usage_metrics PENDING' END

-- Social Features
UNION ALL
SELECT 'Social Features', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'close_friends') THEN '✅ close_friends' ELSE '⏳ close_friends PENDING' END
UNION ALL
SELECT 'Social Features', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'communities') THEN '✅ communities' ELSE '⏳ communities PENDING' END
UNION ALL
SELECT 'Social Features', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suggested_users') THEN '✅ suggested_users' ELSE '⏳ suggested_users PENDING' END

-- AI Image Generation
UNION ALL
SELECT 'AI Features', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_generated_images') THEN '✅ ai_generated_images' ELSE '⏳ ai_generated_images PENDING' END
UNION ALL
SELECT 'AI Features', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_generation_quota') THEN '✅ daily_generation_quota' ELSE '⏳ daily_generation_quota PENDING' END

ORDER BY migration_group, status;

-- =====================================================
-- 11. SUBSCRIPTION SCHEMA CONFLICT CHECK
-- =====================================================
SELECT '=== SUBSCRIPTION SCHEMA CHECK ===' AS section;

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'subscriptions'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'profiles'
    ) THEN '✅ Subscriptions references PROFILES (Migration #8 design)'
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      WHERE tc.table_name = 'subscriptions'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN '⚠️ Subscriptions references AUTH.USERS (Migration #17 design)'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions')
    THEN '❌ Subscriptions exists but NO FOREIGN KEY - corrupt state!'
    ELSE '⏳ Subscriptions table does not exist yet'
  END AS schema_status;

-- =====================================================
-- 12. EXTENSION CHECK
-- =====================================================
SELECT
  '=== EXTENSIONS ===' AS section,
  extname AS extension_name,
  extversion AS version,
  CASE
    WHEN extname = 'uuid-ossp' THEN '✅ Required for UUID generation'
    WHEN extname = 'pg_stat_statements' THEN 'ℹ️ Query performance tracking'
    WHEN extname = 'pgcrypto' THEN 'ℹ️ Encryption functions'
    ELSE 'ℹ️ Optional extension'
  END AS status
FROM pg_extension
WHERE extname NOT LIKE 'plpgsql'
ORDER BY extname;

-- =====================================================
-- 13. SUMMARY
-- =====================================================
SELECT '=== SUMMARY ===' AS info;

SELECT
  'Total Tables' AS metric,
  COUNT(*)::TEXT AS value
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
UNION ALL
SELECT
  'Total RLS Policies',
  COUNT(*)::TEXT
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Total Triggers',
  COUNT(DISTINCT trigger_name)::TEXT
FROM information_schema.triggers
WHERE trigger_schema = 'public'
UNION ALL
SELECT
  'Total Functions',
  COUNT(*)::TEXT
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name NOT LIKE 'pg_%'
UNION ALL
SELECT
  'Storage Buckets',
  COUNT(*)::TEXT
FROM storage.buckets
UNION ALL
SELECT
  'Total Indexes',
  COUNT(*)::TEXT
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY metric;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
SELECT '✅ VERIFICATION COMPLETE' AS message;
SELECT 'Compare results with expected state in DATABASE_MIGRATION_AUDIT.md' AS next_step;
