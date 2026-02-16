# Configuración de Auth y emails en Supabase

Para que la **verificación de email** y la **recuperación de contraseña** funcionen en producción, configura lo siguiente en el Dashboard de Supabase.

---

## 1. Activar confirmación de email

1. **Authentication** → **Providers** → **Email**.
2. Activa **"Confirm email"**.
3. **Importante:** desactiva **"Allow unverified email sign in"** (o equivalente) si aparece. Así Supabase rechazará el inicio de sesión hasta que el usuario haya hecho clic en el enlace del correo.
4. Así al registrarse Supabase envía un correo de verificación y el usuario no puede iniciar sesión hasta confirmar.

---

## 1.1. Protección contra contraseñas filtradas (HIBP)

1. **Authentication** → **Settings** (o **Security**).
2. Activa **"Leaked password protection"** / **"HaveIBeenPwned"**.
3. Supabase rechazará contraseñas que aparezcan en filtraciones públicas. La app ya muestra un mensaje claro al usuario: *"Esta contraseña ha aparecido en una filtración de datos. Elige otra más segura..."* (registro y nueva contraseña).

---

## 2. URLs de redirección

1. **Authentication** → **URL Configuration**.
2. **Site URL**: dominio de producción:
   ```
   https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app
   ```
3. **Redirect URLs**: añade estas URLs (una por línea) con tu dominio de Vercel:
   ```
   https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app/auth/callback
   https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app/auth/callback?next=/nueva-contrasena
   https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app/auth/callback?next=/panel
   https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app/panel
   https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app/nueva-contrasena
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/callback?next=/nueva-contrasena
   http://localhost:3000/auth/callback?next=/panel
   http://localhost:3000/panel
   http://localhost:3000/nueva-contrasena
   ```
   - Tras **confirmar el email**, Supabase redirige a la primera (o a la que tengas como Site URL + path por defecto; si hace falta, en la plantilla de email puedes usar `{{ .ConfirmationURL }}` que Supabase reemplaza).
   - El enlace de **recuperar contraseña** y el de **confirmar email** redirigen a `/auth/callback`, que intercambia el código por sesión y envía a `/nueva-contrasena` (recovery) o `/panel` (signup). Añade `/auth/callback` a Redirect URLs.

---

## 3. Plantillas de email en español

1. **Authentication** → **Email Templates**.
2. Para cada plantilla que uses, cambia el texto al español:

### Confirm signup (Confirmar registro)
- **Subject**: `Confirma tu cuenta - Fuente Palmera Pádel`
- **Body**: texto en español indicando que debe hacer clic en el enlace para activar la cuenta.
- **Enlace en la plantilla (importante)**: no uses `{{ .ConfirmationURL }}`. Usa esta URL para que el callback cree la sesión y redirija a login con mensaje de éxito:
  ```
  {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup
  ```
  Así el usuario llega a `/auth/callback` con `type=signup`, la app hace `verifyOtp` y redirige a `/login?verified=true`.

### Reset password (Recuperar contraseña)
- **Subject**: `Restablece tu contraseña - Fuente Palmera Pádel`
- **Body**: texto en español indicando que ha solicitado cambiar la contraseña y que debe hacer clic en el enlace. Usa `{{ .ConfirmationURL }}` (o el equivalente que ofrezca la plantilla) como enlace. El enlace redirige a `https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app/auth/callback?next=/nueva-contrasena`.

Si en la plantilla solo aparece una URL genérica, asegúrate de que en **Redirect URLs** esté `https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app/nueva-contrasena` para que el enlace de “reset password” abra esa ruta.

---

## 4. Resumen de rutas de la app

| Ruta | Uso |
|------|-----|
| `/registro` | Alta; tras registrarse se muestra en la misma página “Revisa tu correo” (sin redirigir). Usuario con email no confirmado no puede entrar al panel. |
| `/login` | Inicio de sesión. Si llega con `?verified=true` se muestra banner “Tu cuenta ha sido verificada”. Enlace “¿Olvidaste tu contraseña?” → `/recuperar-contrasena` |
| `/recuperar-contrasena` | Formulario con email; Supabase envía correo con enlace |
| `/nueva-contrasena` | Formulario nueva contraseña (enlace del email); tras guardar → `/login?password-reset=success` |

---

## 5. Envío de correos (SendGrid)

Para no depender del límite de Supabase, configura SMTP con SendGrid: **[SENDGRID-SUPABASE.md](./SENDGRID-SUPABASE.md)**.
