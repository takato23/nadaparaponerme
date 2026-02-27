-- =====================================================
-- On-demand Closet AI foundation
-- =====================================================

-- 1) Track analysis status per clothing item
ALTER TABLE clothing_items
ADD COLUMN IF NOT EXISTS ai_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_metadata_version INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_last_error TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clothing_items_ai_status_check'
  ) THEN
    ALTER TABLE clothing_items
    ADD CONSTRAINT clothing_items_ai_status_check
    CHECK (ai_status IN ('pending', 'processing', 'ready', 'failed'));
  END IF;
END $$;

UPDATE clothing_items
SET
  ai_status = CASE
    WHEN ai_metadata IS NOT NULL AND ai_metadata <> '{}'::jsonb THEN 'ready'
    ELSE 'pending'
  END,
  ai_analyzed_at = CASE
    WHEN ai_metadata IS NOT NULL AND ai_metadata <> '{}'::jsonb THEN COALESCE(ai_analyzed_at, updated_at, created_at)
    ELSE ai_analyzed_at
  END,
  ai_metadata_version = CASE
    WHEN ai_metadata IS NOT NULL AND ai_metadata <> '{}'::jsonb THEN GREATEST(COALESCE(ai_metadata_version, 0), 1)
    ELSE COALESCE(ai_metadata_version, 0)
  END
WHERE ai_status IS NULL OR ai_metadata_version IS NULL;

CREATE INDEX IF NOT EXISTS idx_clothing_items_user_ai_status
  ON clothing_items(user_id, ai_status)
  WHERE deleted_at IS NULL;

-- 2) Insight cache (closet_hash + prompt_hash + insight_type)
CREATE TABLE IF NOT EXISTS ai_insight_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  closet_hash TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT,
  credits_used INTEGER NOT NULL DEFAULT 0,
  hit_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_insight_cache_type_check CHECK (insight_type IN ('mix', 'chat', 'report')),
  CONSTRAINT ai_insight_cache_unique UNIQUE (user_id, insight_type, closet_hash, prompt_hash)
);

CREATE INDEX IF NOT EXISTS idx_ai_insight_cache_user_type
  ON ai_insight_cache(user_id, insight_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_insight_cache_expires_at
  ON ai_insight_cache(expires_at);

-- 3) Insight jobs (traceability + idempotency)
CREATE TABLE IF NOT EXISTS ai_insight_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  request_json JSONB,
  response_json JSONB,
  error_text TEXT,
  prompt_hash TEXT,
  closet_hash TEXT,
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_insight_jobs_type_check CHECK (insight_type IN ('mix', 'chat', 'report')),
  CONSTRAINT ai_insight_jobs_status_check CHECK (status IN ('pending', 'success', 'failed')),
  CONSTRAINT ai_insight_jobs_unique UNIQUE (user_id, insight_type, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_insight_jobs_user_created
  ON ai_insight_jobs(user_id, created_at DESC);

-- 4) RLS
ALTER TABLE ai_insight_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insight_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own ai insight cache" ON ai_insight_cache;
CREATE POLICY "Users can read own ai insight cache"
  ON ai_insight_cache FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can write own ai insight cache" ON ai_insight_cache;
CREATE POLICY "Users can write own ai insight cache"
  ON ai_insight_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own ai insight jobs" ON ai_insight_jobs;
CREATE POLICY "Users can read own ai insight jobs"
  ON ai_insight_jobs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can write own ai insight jobs" ON ai_insight_jobs;
CREATE POLICY "Users can write own ai insight jobs"
  ON ai_insight_jobs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Keep updated_at in sync when helper trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    DROP TRIGGER IF EXISTS trigger_ai_insight_cache_updated_at ON ai_insight_cache;
    CREATE TRIGGER trigger_ai_insight_cache_updated_at
      BEFORE UPDATE ON ai_insight_cache
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

    DROP TRIGGER IF EXISTS trigger_ai_insight_jobs_updated_at ON ai_insight_jobs;
    CREATE TRIGGER trigger_ai_insight_jobs_updated_at
      BEFORE UPDATE ON ai_insight_jobs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
