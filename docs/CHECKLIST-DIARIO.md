# Checklist diario — Fuente Palmera Pádel

Objetivo: comprobar en pocos minutos que los flujos críticos del club siguen funcionando. Marca cada ítem cuando lo completes.

**Automático (recomendado cada día antes del checklist manual)**

En la raíz del proyecto, con `.env.local` configurado (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.):

```bash
npm run smoke
```

Opcional — además probar la app desplegada por HTTP (login + availability):

```bash
SMOKE_BASE_URL=https://tu-dominio.vercel.app npm run smoke
```

En CI (GitHub Actions, etc.), sin archivo `.env.local`, inyecta las mismas variables y ejecuta:

```bash
npm run smoke:ci
```

Si `npm run smoke` falla, revisa el mensaje en consola antes de seguir con las pruebas manuales.

---

**Antes de empezar**

- [ ] Tienes clara la URL (producción o preview).
- [ ] Opcional: usuario de prueba **no admin** con saldo mínimo (p. ej. 10 €) solo para smoke tests; si no existe, usa tu cuenta sabiendo que **las cuentas con `role: admin` pagan igual** que el resto al reservar desde el panel de socio.
- [ ] Anota la hora de inicio del test (útil si algo falla y miras logs en Vercel).

---

## A. Checklist rápido (5–10 min) — cada día laborable

### 1. Acceso y panel de socio

- [ ] **Login** (`/login`) con usuario conocido.
- [ ] Entra al **panel** (`/panel`) y carga el dashboard sin error.
- [ ] **Perfil** (`/panel/perfil`): se muestra nombre y datos coherentes.
- [ ] **Monedero** (`/panel/monedero`): ves saldo y movimientos (o al menos el saldo actual).

### 2. Reservas y monedero (lo más importante)

- [ ] **Reservas** (`/panel/reservas`): lista de pistas y fechas carga.
- [ ] Abre una fecha con huecos y comprueba que la **disponibilidad** muestra franjas razonables (no todo vacío si debería haber pista).
- [ ] Elige una franja **lejana** (no hoy en último minuto) y reserva con **monedero**:
  - [ ] La reserva se confirma en UI.
  - [ ] El saldo baja **4,50 €** si eres socio activo con cuota al día, o **5,00 €** si no.
- [ ] **Cancelación** (si tu política lo permite en esa franja): cancela la reserva de prueba y comprueba que el monedero / estado vuelve como esperas.

### 3. Reglas de negocio rápidas

- [ ] **Antelación 25 min** (solo usuario normal): si es hoy, una franja que empiece en &lt;25 min no debería aparecer como disponible (salvo bypass admin en disponibilidad).
- [ ] **14 días**: no deberías poder reservar más allá de 14 días (mensaje de error claro).

### 4. Socios y bonos (si aplica en tu club)

- [ ] Usuario **no socio**: no debe poder pagar con **bono** (mensaje claro).
- [ ] Usuario **socio activo**: si usáis bono, una reserva con bono consume bono y **no** debe duplicar descuento de monedero en la misma reserva.

### 5. Admin (solo si gestionáis el club a diario desde admin)

- [ ] **Login admin** y acceso a `/admin` sin error.
- [ ] **Reservas admin** (`/admin/reservas`): lista carga.
- [ ] **Transacciones** (`/admin/transacciones`) o **Finanzas** (`/admin/finanzas`): números cargan sin pantalla en blanco.

### 6. Pagos Cecabank (solo si usáis recargas / membresía hoy)

- [ ] **Recarga monedero** (flujo real o importe mínimo en test): redirección Cecabank y vuelta a éxito; saldo sube.
- [ ] **Membresía** (si toca renovación): flujo completo y estado de socio coherente.

### 7. Emails

- [ ] Tras una reserva nueva, el club recibe el aviso por correo (puede tardar unos segundos; el envío va en segundo plano).

---

## B. Checklist semanal o tras cada deploy (15–25 min)

### Panel de socio

- [ ] **Membresía** (`/panel/membresia`): estado, fecha de caducidad y CTA de pago coherentes.
- [ ] **Política de cancelación** (`/politica-cancelacion`): enlaces desde el sitio siguen bien.

### Admin — operaciones que no haces cada día

- [ ] **Usuarios** (`/admin/usuarios`): búsqueda y ficha de usuario.
- [ ] **Monederos** (`/admin/monederos`): recarga manual (solo si procede) y reflejo en transacciones.
- [ ] **Pistas** (`/admin/pistas`): activar/desactivar pista si lo usáis.
- [ ] **Horarios** (`/admin/horarios`) y **excepciones**: un día concreto muestra el horario esperado.
- [ ] **Horarios bloqueados** (`/admin/horarios-bloqueados`): bloqueo visible en reservas.
- [ ] **Estadísticas** (`/admin/estadisticas`) y **export** de reservas/transacciones si los usáis para cierre.

### Cuenta y legal

- [ ] **Registro** (`/registro`) — flujo básico (puede ser en staging).
- [ ] **Recuperar contraseña** (`/recuperar-contrasena`).
- [ ] Páginas legales (`/privacidad`, `/aviso-legal`, `/cookies`) abren correctamente.

---

## C. Qué hacer si algo falla

1. Anota **URL**, **usuario** (sin contraseña), **hora**, **qué ítem** del checklist y **mensaje de error** en pantalla.
2. En el navegador: **DevTools → Network** → petición fallida (`create`, `availability`, etc.) → copia **status** y cuerpo de respuesta (sin tokens).
3. En **Vercel → Logs** de la función en esa franja horaria.
4. En **Supabase → Logs / SQL** si el error parece de base de datos (RPC, RLS).

---

## D. Notas técnicas (referencia rápida)

| Flujo | Rutas / API relevantes |
|--------|-------------------------|
| Disponibilidad | `GET/POST` según app → `/api/bookings/availability` |
| Crear reserva | `/api/bookings/create` (monedero → RPC `booking_pay_deposit`; bono → `usar_bono` + insert) |
| Cancelar (usuario) | `/api/bookings/cancel` |
| Panel perfil | `/api/panel/profile` |
| Recarga / membresía Cecabank | `/api/ceca/*` |
| Admin reservas / monedero | `/api/admin/bookings/*`, `/api/admin/wallet/recharge` |

---

## E. Mejora continua (opcional)

Si queréis automatizar parte de esto más adelante: tests **Playwright** contra un entorno **preview** (Vercel + Supabase de staging) con un usuario de prueba y datos desechables.
