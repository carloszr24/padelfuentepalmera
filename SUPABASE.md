# Configuración de Supabase para Fuente Palmera Padel

La app usa Supabase para autenticación, perfiles, pistas, reservas, transacciones y horarios bloqueados. **Tienes que ejecutar el SQL en tu proyecto de Supabase**; no se puede hacer desde aquí.

---

## Qué hacer en Supabase (paso a paso)

### 1. Entrar en el Dashboard
- Ve a [supabase.com/dashboard](https://supabase.com/dashboard) e inicia sesión.
- Abre tu proyecto (el que tiene la URL y la anon key de tu `.env.local`).

### 2. Abrir el editor SQL
- En el menú izquierdo: **SQL Editor**.
- Pulsa **New query** (nueva consulta).

### 3. Ejecutar el script de la base de datos
- Abre el archivo **`supabase/schema.sql`** de este proyecto (en tu editor de código).
- Copia **todo** el contenido.
- Pégalo en el editor SQL de Supabase.
- Pulsa **Run** (o Ctrl+Enter).

Ese script crea:
- Tipos: `user_role`, `booking_status`, `transaction_type`
- Tablas: `profiles`, `courts`, `bookings`, `transactions`, `court_schedules`
- Trigger para crear un perfil automáticamente cuando alguien se registra
- Función `updated_at` y triggers en las tablas que la usan
- Funciones de negocio: `wallet_recharge`, `admin_wallet_recharge`, `booking_pay_deposit`, `booking_refund_deposit`
- **RLS** (Row Level Security) en todas las tablas y políticas

Si algo falla (por ejemplo “relation already exists”), es que ya tienes tablas o funciones creadas; puedes ajustar el script o borrar lo que sobre y volver a ejecutar con cuidado.

### 4. Desactivar confirmación de email (opcional)
- **Authentication** → **Providers** → **Email**.
- Desactiva **“Confirm email”** si no quieres que los usuarios tengan que validar el correo al registrarse.

### 5. Crear al menos una pista y un admin
Después de ejecutar el schema:

- **Pista:** en **Table Editor** → tabla **courts** → **Insert row**. Por ejemplo: `name`: "Pista 1", `type`: "Exterior", `is_active`: true, `price`: 18, `deposit`: 4.5.
- **Admin:** cuando un usuario ya esté registrado, en la tabla **profiles** localiza su fila (por `id` = el UUID del usuario en Authentication → Users) y cambia `role` a `admin`.

---

## ¿Puedes hacerlo tú por mí?

**No.** Solo tú tienes acceso a tu proyecto de Supabase. Yo no puedo:
- Iniciar sesión en tu cuenta
- Ejecutar SQL en tu base de datos
- Cambiar opciones en el Dashboard

Lo que sí está hecho en el código es:
- Uso de las tablas y funciones que define `schema.sql`
- Llamadas a `booking_pay_deposit`, `wallet_recharge`, `admin_wallet_recharge`
- RLS pensado para que solo los usuarios admins puedan gestionar todo y el resto solo su perfil y sus reservas

Cuando el schema esté ejecutado y tengas al menos una pista (y un usuario admin si quieres probar el panel admin), la app debería funcionar con normalidad.

---

## Si “Últimas reservas” o “Últimas transacciones” no muestran nombre o pista

El panel admin hace un *join* con `profiles` y `courts`. La tabla `bookings` tiene **dos** FKs a `profiles` (`user_id` y `created_by`), por eso en el código se usa la relación explícita `profiles!bookings_user_id_fkey` para mostrar el **cliente** de la reserva.

Si en tu proyecto los nombres de las restricciones FK son otros (por ejemplo si creaste las tablas desde el editor con otros nombres), la consulta puede fallar o devolver vacío. Para ver los nombres reales en Supabase:

1. **SQL Editor** → Nueva consulta.
2. Ejecuta:
   ```sql
   SELECT conname FROM pg_constraint
   WHERE conrelid = 'public.bookings'::regclass AND contype = 'f';
   ```
3. Verás algo como `bookings_user_id_fkey`, `bookings_court_id_fkey`, `bookings_created_by_fkey`. Si el de `user_id` se llama distinto (p. ej. `bookings_profiles_user_id_fkey`), hay que usar ese nombre en el código o avisar para ajustar la query.

---

## Si el saldo del monedero no se actualiza tras recargar con Stripe

1. **Comprobar en Supabase que la función existe**  
   En **SQL Editor** ejecuta el archivo **`supabase/verificar-monedero.sql`** de este repo. Ese script recrea la función `wallet_recharge` por si tenías una versión antigua y comprueba que exista.

2. **Comprobar variables de entorno en Vercel**  
   El webhook usa **`SUPABASE_SERVICE_ROLE_KEY`** (no la anon key). En el proyecto de Vercel → **Settings** → **Environment Variables** debe estar definida. Sin ella, el webhook falla al llamar a Supabase.

3. **Comprobar que el webhook recibe la petición**  
   En Stripe → **Developers** → **Webhooks** → tu endpoint: revisa los intentos recientes. Si el estado es "Failed" o la respuesta es HTML en lugar de JSON, el proxy o la URL pueden estar mal. La URL debe ser `https://tu-dominio.com/api/stripe/webhook` y las rutas `/api/` no deben redirigir a la landing.

4. **Comprobar en Supabase después de una recarga de prueba**  
   - **Table Editor** → **profiles**: busca el usuario que recargó y mira si **wallet_balance** ha aumentado.  
   - **Table Editor** → **transactions**: ordena por **created_at** descendente y comprueba si hay una fila nueva con **type** = `recharge` y el **user_id** correcto.  
   Si no hay fila nueva ni cambio de saldo, el webhook no está llamando bien a la función o la función no está en tu proyecto (vuelve al paso 1).
