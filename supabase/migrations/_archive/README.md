# Migraciones archivadas (one-time / superadas)

Estos `.sql` eran scripts manuales de una sola vez ya aplicados y **superados por
migraciones timestamped** en `supabase/migrations/`. Se conservan solo como referencia
histórica. **No** los ejecutes en una base nueva: `supabase db push` los ignora porque no
tienen prefijo de versión `<timestamp>_`.

| Archivo | Reemplazado por |
|---------|-----------------|
| `APPLY_FRIENDSHIPS.sql` | esquema inicial + `20251119000001_add_close_friends.sql` |
| `FIX_MISSING_BORROWED_ITEMS.sql` | esquema inicial + `20260402000001_borrow_integrity_and_activity_normalization.sql` |
| `MANUAL_RUN_subscriptions_and_payments.sql` | `20250101000008_subscriptions_and_payments.sql` |
| `apply_style_challenges.sql` | `20250101000005_style_challenges.sql` |
| `fix_clothing_images_public.sql` | aplicado manualmente (permiso de bucket) |
| `DEPLOY_ALL_PENDING.sql` | helper previo a migraciones automáticas (solo comentarios) |
