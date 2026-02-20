-- Índices para acelerar las consultas del panel de usuario.
-- Ejecutar en SQL Editor de Supabase si las tablas ya existen.
-- Las consultas del dashboard filtran por user_id y ordenan por fecha.

-- bookings: listado por usuario ordenado por fecha (panel inicio, reservas)
CREATE INDEX IF NOT EXISTS idx_bookings_user_id_booking_date_desc
  ON public.bookings (user_id, booking_date DESC, start_time DESC);

-- transactions: últimos movimientos por usuario (panel inicio, monedero)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id_created_at_desc
  ON public.transactions (user_id, created_at DESC);

-- bookings: conteo por usuario y rango de fechas (estadísticas "este mes")
CREATE INDEX IF NOT EXISTS idx_bookings_user_id_booking_date
  ON public.bookings (user_id, booking_date);
