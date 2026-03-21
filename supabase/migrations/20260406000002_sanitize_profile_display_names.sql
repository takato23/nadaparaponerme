BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''), 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
      'Usuario'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

UPDATE public.profiles
SET
  display_name = COALESCE(NULLIF(trim(username), ''), 'Usuario'),
  updated_at = NOW()
WHERE COALESCE(trim(display_name), '') ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$';

COMMIT;
