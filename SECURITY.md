# Seguridad – Fuente Palmera Pádel

**¿Está la web 100% segura?** No. Ningún sistema es 100% seguro; siempre hay riesgo residual y posibles mejoras. Este documento resume qué está bien cubierto y qué se puede reforzar.

---

## Lo que está bien cubierto

### Autenticación y autorización
- **Supabase Auth**: login/registro con sesión por cookies; el middleware refresca el token en cada request.
- **Rutas de panel y admin**: comprueban `getUser()` y el admin exige `role === 'admin'` en layout y en todas las APIs de admin.
- **RLS (Row Level Security)** en Supabase:
  - `profiles`: cada usuario solo ve/edita el suyo; admins ven todo.
  - `bookings`: solo el dueño o admin; inserciones solo vía funciones (booking_pay_deposit, admin_create_booking).
  - `transactions`: solo lectura propia o admin; inserciones solo vía funciones.
  - `courts` / `court_schedules`: lógica coherente con roles.

### Operaciones sensibles en la base de datos
- Cambios de saldo y de reservas se hacen con **funciones SQL (SECURITY DEFINER)** que comprueban permisos y reglas de negocio (por ejemplo `admin_wallet_recharge`, `user_cancel_booking`, `booking_pay_deposit`). No se modifican datos con updates directos desde el cliente.

### Stripe
- **Webhook**: se verifica la firma con `stripe.webhooks.constructEvent(body, signature, webhookSecret)`. Sin firma válida no se acredita saldo.
- **Checkout**: se usa la API de Stripe con `STRIPE_SECRET_KEY` en servidor; las tarjetas no pasan por tu app.

### Secrets
- Claves sensibles (Supabase service role, Stripe secret, webhook secret) están en variables de entorno y solo se usan en servidor (API routes, Server Components). No se exponen al navegador.

### Búsqueda admin (usuarios)
- El parámetro de búsqueda `q` se **sanitiza**: longitud máxima, caracteres permitidos y escape de `%` y `_` en el filtro `ilike` para evitar inyección o filtros demasiado amplios.

---

## Mejoras recomendables

### 1. Rate limiting
- **Login**: limitar intentos por IP (ej. 5 intentos por 15 minutos) para reducir fuerza bruta. Puede hacerse con middleware + Redis/Vercel KV o un servicio externo.
- **APIs**: limitar peticiones por usuario/IP en rutas sensibles (crear reserva, cancelar, recarga monedero, export CSV).

### 2. Validación de entradas en APIs
- Usar **Zod** (u otra librería) en el cuerpo de las peticiones (bookingId, amount, userId, etc.) para validar tipos y rangos y rechazar payloads mal formados.

### 3. Cabeceras de seguridad (opcional)
- En producción, configurar en el servidor (o en Vercel/Next) cabeceras como:
  - `Strict-Transport-Security` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` o `SAMEORIGIN`
  - `Content-Security-Policy` (CSP) según lo que uses (Stripe, Supabase, etc.)

### 4. Política de contraseñas
- En Supabase Auth se puede endurecer la política (longitud mínima, complejidad). Revisar configuración en el dashboard.

### 5. Auditoría y logs
- Registrar en logs (sin datos sensibles) acciones críticas: recargas admin, cancelaciones, creación de reservas admin. Útil para detectar abusos y para auditoría.

### 6. Producción
- Usar **HTTPS** siempre (Vercel/otros hosts lo suelen dar por defecto).
- No commitear `.env.local` ni ningún archivo con secretos; tener `STRIPE_WEBHOOK_SECRET` y la URL del webhook bien configurados en Stripe para producción.

---

## Resumen

La aplicación tiene una base de seguridad sólida: auth, RLS, funciones SQL para operaciones críticas, webhook de Stripe verificado y sanitización de la búsqueda de usuarios. Para un club pequeño o uso interno está en un nivel razonable. Para considerar la página “lo más segura posible” dentro de lo práctico, convendría añadir rate limiting en login y en APIs sensibles, validación explícita (p. ej. Zod) en las rutas API y, en producción, cabeceras de seguridad y buenas prácticas con secretos y HTTPS.
