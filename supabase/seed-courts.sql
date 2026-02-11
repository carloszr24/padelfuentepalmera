-- Insertar las 3 pistas en public.courts
-- Ejecuta este script en Supabase → SQL Editor → New query → Run

INSERT INTO public.courts (name, type, is_active, price, deposit)
VALUES
  ('Pista 1', 'Exterior', true, 18.00, 4.50),
  ('Pista 2', 'Exterior', true, 18.00, 4.50),
  ('Pista 3', 'Cubierta', true, 18.00, 4.50)
;
