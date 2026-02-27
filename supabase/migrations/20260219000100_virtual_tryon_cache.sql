-- Migration: Virtual Try-On cache table for hybrid preview + async HD pipeline
-- Created: 2026-02-19

CREATE TABLE IF NOT EXISTS public.virtual_tryon_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  render_hash TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  source_surface TEXT NOT NULL CHECK (source_surface IN ('mirror', 'studio')),
  quality TEXT NOT NULL CHECK (quality IN ('flash', 'pro')),
  preset TEXT NOT NULL,
  view TEXT NOT NULL CHECK (view IN ('front', 'back', 'side')),
  keep_pose BOOLEAN NOT NULL DEFAULT false,
  use_face_refs BOOLEAN NOT NULL DEFAULT true,
  slot_signature JSONB NOT NULL,
  face_refs_signature TEXT,
  model TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, render_hash)
);

CREATE INDEX IF NOT EXISTS idx_virtual_tryon_cache_user_hash
  ON public.virtual_tryon_cache (user_id, render_hash);

CREATE INDEX IF NOT EXISTS idx_virtual_tryon_cache_user_expires
  ON public.virtual_tryon_cache (user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_virtual_tryon_cache_user_updated
  ON public.virtual_tryon_cache (user_id, updated_at DESC);

ALTER TABLE public.virtual_tryon_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own virtual tryon cache" ON public.virtual_tryon_cache;
CREATE POLICY "Users can view own virtual tryon cache"
  ON public.virtual_tryon_cache FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own virtual tryon cache" ON public.virtual_tryon_cache;
CREATE POLICY "Users can insert own virtual tryon cache"
  ON public.virtual_tryon_cache FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own virtual tryon cache" ON public.virtual_tryon_cache;
CREATE POLICY "Users can update own virtual tryon cache"
  ON public.virtual_tryon_cache FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own virtual tryon cache" ON public.virtual_tryon_cache;
CREATE POLICY "Users can delete own virtual tryon cache"
  ON public.virtual_tryon_cache FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.update_virtual_tryon_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_virtual_tryon_cache_updated_at ON public.virtual_tryon_cache;
CREATE TRIGGER trigger_virtual_tryon_cache_updated_at
  BEFORE UPDATE ON public.virtual_tryon_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_virtual_tryon_cache_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_tryon_cache TO authenticated;
