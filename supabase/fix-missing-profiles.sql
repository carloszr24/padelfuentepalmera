-- Crear perfiles para usuarios que existen en auth.users pero no en public.profiles
-- (p. ej. si se registraron antes de tener el trigger). Ejecuta en SQL Editor.

INSERT INTO public.profiles (id, full_name, email)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
