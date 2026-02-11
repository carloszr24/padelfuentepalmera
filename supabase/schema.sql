-- ============================================================
-- Fuente Palmera Padel - Schema Supabase
-- Copia y ejecuta este archivo en SQL Editor de tu proyecto.
-- Puedes ejecutarlo más de una vez: los tipos se crean solo si no existen.
-- ============================================================

-- Tipos (solo si no existen, para poder re-ejecutar el script)
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('confirmed', 'cancelled', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM ('recharge', 'booking_deposit', 'admin_recharge', 'refund');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tabla profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role public.user_role NOT NULL DEFAULT 'user',
  wallet_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_member BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Función updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Trigger: crear perfil al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabla courts
CREATE TABLE IF NOT EXISTS public.courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  price NUMERIC(10,2) NOT NULL DEFAULT 18.00,
  deposit NUMERIC(10,2) NOT NULL DEFAULT 4.50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS set_courts_updated_at ON public.courts;
CREATE TRIGGER set_courts_updated_at
  BEFORE UPDATE ON public.courts
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Tabla bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE RESTRICT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  deposit_paid BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON public.bookings(court_id, booking_date);

DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Tabla transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  stripe_session_id TEXT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_booking_id ON public.transactions(booking_id);

-- Tabla court_schedules
CREATE TABLE IF NOT EXISTS public.court_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_court_schedules_court_date ON public.court_schedules(court_id, blocked_date);

DROP TRIGGER IF EXISTS set_court_schedules_updated_at ON public.court_schedules;
CREATE TRIGGER set_court_schedules_updated_at
  BEFORE UPDATE ON public.court_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Helper: es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

-- Recarga monedero (Stripe webhook)
CREATE OR REPLACE FUNCTION public.wallet_recharge(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_stripe_session_id TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  UPDATE public.profiles SET wallet_balance = wallet_balance + p_amount WHERE id = p_user_id;
  INSERT INTO public.transactions (user_id, type, amount, description, stripe_session_id, created_by)
  VALUES (p_user_id, 'recharge', p_amount, COALESCE(p_description, 'Recarga monedero'), p_stripe_session_id, auth.uid());
END;
$$;

-- Recarga admin
CREATE OR REPLACE FUNCTION public.admin_wallet_recharge(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admins'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  UPDATE public.profiles SET wallet_balance = wallet_balance + p_amount WHERE id = p_user_id;
  INSERT INTO public.transactions (user_id, type, amount, description, created_by)
  VALUES (p_user_id, 'admin_recharge', p_amount, COALESCE(p_description, 'Recarga admin'), auth.uid());
END;
$$;

-- Pagar señal y crear reserva
CREATE OR REPLACE FUNCTION public.booking_pay_deposit(
  p_user_id UUID,
  p_court_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deposit NUMERIC(10,2);
  v_balance NUMERIC(10,2);
  v_booking_id UUID;
BEGIN
  SELECT deposit INTO v_deposit FROM public.courts WHERE id = p_court_id AND is_active = true;
  IF v_deposit IS NULL THEN RAISE EXCEPTION 'Court not found or inactive'; END IF;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance < v_deposit THEN RAISE EXCEPTION 'Insufficient wallet balance for deposit'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.court_id = p_court_id AND b.booking_date = p_booking_date
      AND b.status IN ('confirmed', 'completed')
      AND (b.start_time, b.end_time) OVERLAPS (p_start_time, p_end_time)
  ) THEN RAISE EXCEPTION 'Court already booked in this slot'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.court_schedules cs
    WHERE cs.court_id = p_court_id AND cs.blocked_date = p_booking_date
      AND (cs.start_time, cs.end_time) OVERLAPS (p_start_time, p_end_time)
  ) THEN RAISE EXCEPTION 'Court blocked in this slot'; END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - v_deposit WHERE id = p_user_id;

  INSERT INTO public.bookings (user_id, court_id, booking_date, start_time, end_time, status, deposit_paid, created_by)
  VALUES (p_user_id, p_court_id, p_booking_date, p_start_time, p_end_time, 'confirmed', true, COALESCE(auth.uid(), p_user_id))
  RETURNING id INTO v_booking_id;

  INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
  VALUES (p_user_id, 'booking_deposit', -v_deposit, 'Señal reserva', v_booking_id, COALESCE(auth.uid(), p_user_id));

  RETURN v_booking_id;
END;
$$;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles select own or admin" ON public.profiles;
CREATE POLICY "Profiles select own or admin" ON public.profiles FOR SELECT
  USING (auth.role() = 'service_role' OR public.is_admin() OR id = auth.uid());

DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;
CREATE POLICY "Profiles update own" ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND wallet_balance IS NOT DISTINCT FROM (SELECT wallet_balance FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Profiles admin all" ON public.profiles;
CREATE POLICY "Profiles admin all" ON public.profiles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Courts read active" ON public.courts;
CREATE POLICY "Courts read active" ON public.courts FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Courts admin all" ON public.courts;
CREATE POLICY "Courts admin all" ON public.courts FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Bookings read own or admin" ON public.bookings;
CREATE POLICY "Bookings read own or admin" ON public.bookings FOR SELECT
  USING (auth.role() = 'service_role' OR public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Bookings insert via function" ON public.bookings;
CREATE POLICY "Bookings insert via function" ON public.bookings FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Bookings update own" ON public.bookings;
CREATE POLICY "Bookings update own" ON public.bookings FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Bookings admin all" ON public.bookings;
CREATE POLICY "Bookings admin all" ON public.bookings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Transactions read own or admin" ON public.transactions;
CREATE POLICY "Transactions read own or admin" ON public.transactions FOR SELECT
  USING (auth.role() = 'service_role' OR public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Transactions insert via function" ON public.transactions;
CREATE POLICY "Transactions insert via function" ON public.transactions FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Transactions admin all" ON public.transactions;
CREATE POLICY "Transactions admin all" ON public.transactions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Court schedules read" ON public.court_schedules;
CREATE POLICY "Court schedules read" ON public.court_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Court schedules admin all" ON public.court_schedules;
CREATE POLICY "Court schedules admin all" ON public.court_schedules FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
