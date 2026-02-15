# Recuperación de contraseña

La app permite a los usuarios restablecer su contraseña si la olvidan.

---

## Flujo

1. Usuario en `/login` → clic en **"¿Olvidaste tu contraseña?"** → va a `/recuperar-contraseña`.
2. Introduce su email → Supabase envía un email con un enlace.
3. El usuario hace clic en el enlace del email → llega a `/recuperar-contraseña/confirm`.
4. Introduce nueva contraseña (2 veces) → se actualiza → redirige a `/login?password-reset=success`.

---

## Configuración en Supabase

Para que los emails de recuperación funcionen, configura en **Supabase Dashboard**:

### 1. Email Templates

1. Entra en **Authentication** → **Email Templates**.
2. Busca la plantilla **"Reset Password"** (o "Recuperar contraseña").
3. Verifica que el **Subject** y el contenido incluyan el enlace de reset.

### 2. Site URL y Redirect URLs

1. **Authentication** → **URL Configuration**.
2. **Site URL**: pon tu URL de producción (ej: `https://tu-dominio.vercel.app`).
3. **Redirect URLs**: añade estas URLs (una por línea):
   ```
   https://tu-dominio.vercel.app/recuperar-contraseña/confirm
   http://localhost:3000/recuperar-contraseña/confirm
   ```
   (La segunda es para desarrollo local.)

### 3. Email con SendGrid (recomendado)

Por defecto Supabase tiene poca capacidad de envío. Para recuperación de contraseña y otros correos en producción, configura **SendGrid** como SMTP:

- Guía paso a paso: **[SENDGRID-SUPABASE.md](./SENDGRID-SUPABASE.md)**.
- Resumen: SendGrid → API Key + verificar remitente; Supabase → **Authentication** → **SMTP** → Host `smtp.sendgrid.net`, Port `587`, User `apikey`, Password = API Key.

---

## Rutas creadas

- **`/recuperar-contraseña`**: formulario para solicitar reset (email).
- **`/recuperar-contraseña/confirm`**: formulario para establecer nueva contraseña (solo accesible con token válido del email).

---

## Componentes

- **`AuthForgotPasswordForm`**: formulario que llama a `supabase.auth.resetPasswordForEmail()`.
- **`AuthResetPasswordForm`**: formulario que llama a `supabase.auth.updateUser({ password })`.

---

## Notas

- El enlace del email expira después de un tiempo (configurable en Supabase).
- Si el usuario ya está logueado y va a `/recuperar-contraseña`, se redirige a `/panel`.
- Si alguien intenta acceder a `/recuperar-contraseña/confirm` sin token válido, se redirige a `/recuperar-contraseña` con error.
