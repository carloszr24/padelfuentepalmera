# Auditoría de ciberseguridad – Fuente Palmera Pádel

**Fecha:** Febrero 2025  
**Alcance:** Sitio web completo (Next.js, Supabase, Stripe).  
**Objetivo:** Identificar fortalezas, riesgos y mejoras sin comprometer funcionalidad.

---

## 1. Resumen ejecutivo

| Área              | Estado   | Notas breves                                                |
|-------------------|----------|-------------------------------------------------------------|
| Autenticación     | ✅ Sólido | Supabase Auth, sesión por cookies, comprobación admin       |
| Autorización      | ✅ Sólido | RLS + funciones SECURITY DEFINER + comprobación role en APIs |
| APIs              | ✅ Bueno  | Auth en rutas sensibles; rate limit en admin/checkout/webhook |
| Datos sensibles   | ✅ Bueno  | Secretos en env; anon key público por diseño                |
| Stripe            | ✅ Sólido | Firma webhook; checkout server-side; origen validado        |
| Cabeceras         | ✅ Bueno  | HSTS, X-Frame-Options, X-Content-Type-Options, etc.         |
| Entradas          | ⚠️ Mejorable | Validación UUID en admin; falta en alguna ruta usuario      |
| Rate limiting     | ⚠️ Mejorable | Login sin límite; crear/cancelar reserva usuario sin límite |
| Middleware        | ⚠️ Revisar | `proxy.ts` no está conectado como middleware de Next.js     |

**Conclusión:** La base de seguridad es sólida (auth, RLS, Stripe, cabeceras). Los puntos críticos están protegidos; las mejoras sugeridas refuerzan resistencia a abusos y errores sin cambiar el comportamiento visible.

---

## 2. Autenticación y gestión de sesión

### 2.1 Lo que está bien

- **Supabase Auth:** Login/registro con email y contraseña; sesión por cookies (httpOnly vía Supabase SSR).
- **Confirmación de email:** Comprobada en layout de panel (`email_confirmed_at`); usuarios no confirmados no acceden al panel.
- **Protección de rutas:** Layouts de `/panel` y `/admin` llaman a `getCachedAuth()` y redirigen a `/login` si no hay usuario; admin exige además `profile.role === 'admin'`.
- **Cache de auth:** `getCachedAuth()` usa `unstable_cache` (60 s) para no golpear Supabase en cada request; la clave incluye `userId` para no mezclar usuarios.

### 2.2 Riesgos y recomendaciones

| Riesgo | Severidad | Recomendación |
|--------|-----------|----------------|
| **Fuerza bruta en login** | Media | No hay rate limit en la ruta de login. Añadir límite por IP (ej. 5–10 intentos / 15 min) en middleware o en una API de login server-side. |
| **Política de contraseñas** | Baja | Depende de Supabase (por defecto 6 caracteres). Revisar en Dashboard → Authentication → Settings y endurecer si se desea (longitud, complejidad). |

---

## 3. Autorización y acceso a datos

### 3.1 APIs

- **Rutas de panel** (`/api/panel/*`): Exigen usuario autenticado vía `getCachedAuth()`.
- **Rutas de admin** (`/api/admin/*`): Todas las revisadas exigen `getUser()` y comprobación `profile.role === 'admin'`. Rate limit en las que modifican datos o exportan.
- **Rutas de reservas y pago:**  
  - `POST /api/bookings/create`: Usuario autenticado; la función `booking_pay_deposit` usa `auth.uid()` en la inserción.  
  - `POST /api/bookings/cancel`: Usuario autenticado; `user_cancel_booking` en BD recibe solo `p_booking_id` y usa `auth.uid()` internamente, evitando cancelar reservas de otros (IDOR mitigado en BD).

### 3.2 Base de datos (RLS y funciones)

- **RLS en `profiles`:**  
  - Política de actualización impide cambiar `role`, `wallet_balance`, `has_debt`, `debt_amount` (archivo `rls-admin-protection.sql`). Un usuario no puede hacerse admin por UPDATE directo.
- **Bookings y transactions:**  
  - Lectura/escritura coherente con “solo dueño o admin”; inserciones y cambios sensibles vía funciones (SECURITY DEFINER) que comprueban permisos y reglas de negocio.
- **Funciones críticas:**  
  - `cancel_booking(p_booking_id, p_user_id)` comprueba `v_booking.user_id = p_user_id`; `user_cancel_booking` pasa `auth.uid()`, por lo que no hay IDOR por cancelación.

### 3.3 Recomendaciones

| Riesgo | Severidad | Recomendación |
|--------|-----------|----------------|
| **Validación de UUID en cancelación usuario** | Baja | En `POST /api/bookings/cancel` validar `bookingId` con `isValidUUID(bookingId)` antes de llamar al RPC, alineado con el resto de APIs. |
| **Documentar dependencia de RLS** | Baja | Dejar claro en SECURITY.md que la defensa en profundidad depende de RLS + políticas de API; no confiar solo en el cliente. |

---

## 4. APIs: entradas, rate limit y errores

### 4.1 Validación de entradas

- **Admin:** `userId`, `courtId`, `bookingId`, etc. se validan con `isValidUUID()` en las rutas que los usan (crear reserva, noshow, cancel, mark-remaining-paid, court-schedules, courts/toggle, wallet/recharge).
- **Búsqueda de usuarios:** El parámetro `q` se sanitiza (longitud, caracteres permitidos, escape de `%` y `_` en el filtro `ilike`) en la página de admin usuarios.
- **Crear reserva (usuario):** Se valida `bookingDate`, `startTime`, `endTime` y ventana de 14 días; no se valida formato UUID de `courtId` en la API (Supabase lo rechazaría si fuera inválido). Opcional: validar `courtId` con `isValidUUID` para respuestas más claras.
- **Crear usuario (admin):** Email con regex, contraseña mínima 6 caracteres, `full_name` y `phone` con límite de longitud.

### 4.2 Rate limiting

- **Implementación:** `src/lib/rate-limit.ts`: en memoria por IP; ventanas de 60 s; límites: checkout 5/min, webhook 20/min, admin 10/min.
- **Rutas con rate limit:**  
  - Checkout Stripe, webhook Stripe, todas las rutas admin que se han revisado (create booking, noshow, cancel, mark-remaining-paid, court-schedules, courts/toggle, wallet/recharge, export bookings, export transactions, stats, stats/bookings).
- **Rutas sin rate limit:**  
  - Login (formulario cliente → Supabase directo).  
  - `POST /api/bookings/create` (usuario).  
  - `POST /api/bookings/cancel` (usuario).  
  - `GET /api/panel/courts`, `GET /api/panel/profile`.  
  - `GET/PUT /api/admin/schedule`, `GET/POST/DELETE /api/admin/schedule/exceptions`.  
  - `POST /api/admin/users/create`.

Recomendación: valorar rate limit por IP (o por usuario cuando aplique) en login y en creación/cancelación de reservas por usuario para limitar abuso y fuerza bruta.

### 4.3 Manejo de errores

- No se exponen stack traces ni detalles internos en respuestas al cliente; mensajes genéricos o controlados. Los logs con detalle quedan en servidor (adecuado para producción).

---

## 5. Stripe y pagos

- **Checkout:** Creado en servidor con `STRIPE_SECRET_KEY`; se valida origen/referer contra una lista de orígenes permitidos; amount entre MIN/MAX EUR; rate limit por IP; usuario autenticado.
- **Webhook:**  
  - Firma verificada con `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)`; sin firma válida no se acredita saldo.  
  - Rate limit por IP.  
  - Validación de `userId` y `amount` antes de llamar a `wallet_recharge`.
- **Tarjetas:** No pasan por la aplicación; flujo mediante Stripe Checkout.
- **Secretos:** `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` solo en servidor (variables de entorno).

Recomendación: en producción, asegurar que la URL del webhook en Stripe use HTTPS y que el secret corresponda al entorno (evitar reutilizar el de desarrollo).

---

## 6. Secretos y variables de entorno

- **.gitignore:** Incluye `.env*`; no se commitean entornos con secretos.
- **Uso en código:**  
  - `NEXT_PUBLIC_*`: solo URL de Supabase, anon key, URL de sitio y URL de la app; adecuado para cliente.  
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`: solo usados en servidor (API routes, Server Components, `createSupabaseServiceClient()`).
- **.env.example:** Documenta variables sin valores reales; no incluye service role ni claves Stripe secretas.

Ningún uso detectado de secretos en código cliente ni en `dangerouslySetInnerHTML`/`eval` que pudiera filtrar datos sensibles.

---

## 7. Cabeceras de seguridad (next.config)

Configuración actual (aplicada a todas las rutas):

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

No hay Content-Security-Policy (CSP). Para endurecer más, se podría añadir una CSP restrictiva (teniendo en cuenta dominios de Stripe, Supabase, etc.) y ajustar según se detecten incidencias de “blocked by CSP”.

---

## 8. Cliente (XSS, exposición de datos)

- No se ha encontrado uso de `dangerouslySetInnerHTML`, `innerHTML`, `eval` ni `document.write` en el código revisado.
- Los datos de usuario (nombre, email, saldo, reservas) se muestran vía React; el riesgo XSS en contenido generado por el servidor es bajo si no se introduce HTML no sanitizado en el futuro.
- El panel y el admin dependen de que el layout compruebe auth; no se asume que el cliente “oculte” rutas como única defensa.

---

## 9. Middleware y proxy

- Existe `src/proxy.ts` que implementa comprobación de usuario, confirmación de email y rol admin para rutas `/panel` y `/admin`, con redirecciones adecuadas.
- En el proyecto no hay `middleware.ts` (o equivalente en la raíz/src) que exporte y use esta lógica como middleware de Next.js. Por tanto, la protección de rutas depende de los layouts (getCachedAuth + redirect), no del middleware.
- Recomendación: o bien conectar `proxy` como middleware de Next.js (creando `middleware.ts` que lo invoque) para una capa adicional de protección y consistencia, o bien documentar explícitamente que la protección se hace solo a nivel de layout y no en middleware.

---

## 10. Exportación de datos (CSV)

- **Transacciones:** Solo admin; rate limit; máximo 2000 filas; escape de CSV para `;`, `"` y `\n` para reducir riesgo de inyección en CSV.
- **Reservas:** Export revisado con misma idea (admin, rate limit).  
Ambos son coherentes con un uso interno y controlado.

---

## 11. Dependencias

- `package.json` usa versiones fijas o con caret para Next, React, Supabase, Stripe, etc. No se han ejecutado herramientas tipo `npm audit` en esta auditoría.
- Recomendación: ejecutar periódicamente `npm audit` y revisar dependencias críticas (Supabase, Stripe, Next) ante actualizaciones de seguridad.

---

## 12. Checklist de acciones recomendadas

| Prioridad | Acción | Estado |
|-----------|--------|--------|
| Alta | Añadir rate limit en login (por IP) para mitigar fuerza bruta. | ✅ Aplicado |
| Alta | Valorar rate limit en `POST /api/bookings/create` y `POST /api/bookings/cancel` (por IP o por usuario). | ✅ Aplicado |
| Media | Validar `bookingId` con `isValidUUID()` en `POST /api/bookings/cancel`. | ✅ Aplicado |
| Media | Conectar `proxy.ts` como middleware de Next.js o documentar que la protección es solo vía layout. | ✅ Aplicado |
| Media | Revisar política de contraseñas en Supabase (longitud/complejidad) según requisitos del club. | Pendiente (config Supabase) |
| Baja | Validar `courtId` con `isValidUUID()` en `POST /api/bookings/create`. | ✅ Aplicado |
| Baja | Considerar Content-Security-Policy en producción tras validar que no rompe Stripe/Supabase. | Pendiente |
| Baja | Ejecutar `npm audit` de forma periódica y planificar actualizaciones de dependencias. | Pendiente |

### Cambios aplicados (post-auditoría)

- **Login con rate limit:** Nueva ruta `POST /api/auth/login` que aplica límite de 10 intentos por 15 minutos por IP; el formulario de login usa esta API en lugar de llamar a Supabase directamente desde el cliente.
- **Rate limit en reservas (usuario):** `POST /api/bookings/create` y `POST /api/bookings/cancel` limitados a 20 peticiones por minuto por IP (clave `booking` en `rate-limit.ts`).
- **Validación UUID:** `bookingId` validado con `isValidUUID()` en cancelación; `courtId` validado con `isValidUUID()` en creación de reserva.
- **Middleware:** Creado `src/middleware.ts` que exporta la lógica de `proxy.ts` como middleware de Next.js; se ejecuta en cada request a `/panel` y `/admin` (salvo API y estáticos). Ajuste en `proxy.ts`: redirección a `/login` cuando no hay usuario en rutas panel/admin.

---

## 13. Conclusión

El sitio tiene una base de seguridad sólida: autenticación y autorización bien delimitadas, RLS y funciones SECURITY DEFINER para operaciones críticas, Stripe con webhook firmado y checkout seguro, cabeceras de seguridad y buen manejo de secretos. No se han detectado fallos críticos que permitan escalada de privilegios, IDOR en cancelaciones o bypass de pago.

Las mejoras propuestas refuerzan la resistencia a abusos (rate limit en login y reservas), la consistencia en validación de entradas (UUID en cancelación de reserva usuario) y la claridad operativa (middleware vs layout). Implementar las de prioridad alta y media mejoraría de forma tangible la postura de ciberseguridad sin afectar al uso normal del sitio.
