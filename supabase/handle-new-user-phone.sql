-- Trigger handle_new_user: añadir phone desde raw_user_meta_data, solo 9 dígitos.
-- Ejecutar en Supabase → SQL Editor.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_phone TEXT;
  v_raw   TEXT;
BEGIN
  v_raw := NEW.raw_user_meta_data->>'phone';
  IF v_raw IS NOT NULL AND v_raw <> '' THEN
    v_phone := left(regexp_replace(v_raw, '[^0-9]', '', 'g'), 9);
  ELSE
    v_phone := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_phone
  );
  RETURN NEW;
END;
$$;
