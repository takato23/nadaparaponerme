-- Migration: extend guided look workflow statuses for hybrid chat orchestration
-- Date: 2026-04-02

ALTER TABLE guided_look_sessions
  DROP CONSTRAINT IF EXISTS guided_look_sessions_status_check;

ALTER TABLE guided_look_sessions
  ADD CONSTRAINT guided_look_sessions_status_check
  CHECK (
    status IN (
      'idle',
      'collecting',
      'choosing_mode',
      'confirming',
      'generating',
      'generated',
      'editing',
      'tryon_confirming',
      'tryon_generating',
      'cancelled',
      'error'
    )
  );
