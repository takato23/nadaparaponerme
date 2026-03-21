-- Align launch pricing with the Instagram rollout strategy.
-- Runs after billing_catalog_and_usage creates the billing tables.

UPDATE public.billing_plan_catalog
SET
  description = 'Cargá tu armario y empezá a usar Kumbi gratis',
  visible_pricing = jsonb_build_object(
    'ARS', jsonb_build_object('monthly_minor', 0, 'currency', 'ARS', 'display', 'Gratis'),
    'USD', jsonb_build_object('monthly_minor', 0, 'currency', 'USD', 'display', 'Free')
  ),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'recommended', false,
    'analysis_monthly_limit', 50
  ),
  updated_at = NOW()
WHERE plan_code = 'free';

UPDATE public.billing_plan_catalog
SET
  description = 'Desbloqueá shopping real para completar tus looks',
  visible_pricing = jsonb_build_object(
    'ARS', jsonb_build_object('monthly_minor', 7990, 'currency', 'ARS', 'display', 'AR$ 7.990/mes'),
    'USD', jsonb_build_object('monthly_minor', 799, 'currency', 'USD', 'display', 'US$ 7.99/month')
  ),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'recommended', true,
    'analysis_monthly_limit', 150
  ),
  updated_at = NOW()
WHERE plan_code = 'plus';

UPDATE public.billing_plan_catalog
SET
  description = 'Para uso intensivo de Kumbi, shopping real y capa visual premium',
  visible_pricing = jsonb_build_object(
    'ARS', jsonb_build_object('monthly_minor', 10990, 'currency', 'ARS', 'display', 'AR$ 10.990/mes'),
    'USD', jsonb_build_object('monthly_minor', 1099, 'currency', 'USD', 'display', 'US$ 10.99/month')
  ),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'recommended', false,
    'analysis_monthly_limit', 400
  ),
  updated_at = NOW()
WHERE plan_code = 'pro';

UPDATE public.billing_plan_buckets
SET
  monthly_limit = CASE bucket_key
    WHEN 'kumbi_messages' THEN 100
    WHEN 'shopping_grounded_searches' THEN 0
    WHEN 'tryons' THEN 1
    ELSE monthly_limit
  END,
  updated_at = NOW()
WHERE plan_code = 'free'
  AND bucket_key IN ('kumbi_messages', 'shopping_grounded_searches', 'tryons');

UPDATE public.billing_plan_buckets
SET
  monthly_limit = CASE bucket_key
    WHEN 'kumbi_messages' THEN 600
    WHEN 'shopping_grounded_searches' THEN 8
    WHEN 'tryons' THEN 4
    ELSE monthly_limit
  END,
  updated_at = NOW()
WHERE plan_code = 'plus'
  AND bucket_key IN ('kumbi_messages', 'shopping_grounded_searches', 'tryons');

UPDATE public.billing_plan_buckets
SET
  monthly_limit = CASE bucket_key
    WHEN 'kumbi_messages' THEN 1500
    WHEN 'shopping_grounded_searches' THEN 20
    WHEN 'tryons' THEN 8
    ELSE monthly_limit
  END,
  updated_at = NOW()
WHERE plan_code = 'pro'
  AND bucket_key IN ('kumbi_messages', 'shopping_grounded_searches', 'tryons');
