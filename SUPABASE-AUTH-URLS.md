# Configuración de Auth y emails en Supabase

Para que la **verificación de email** y la **recuperación de contraseña** funcionen en producción, configura lo siguiente en el Dashboard de Supabase.

---

## 1. Activar confirmación de email

1. **Authentication** → **Providers** → **Email**.
2. Activa **"Confirm email"**.
3. Así, al registrarse Supabase envía un correo de verificación y el usuario no puede entrar al panel hasta confirmar.

---

## 2. URLs de redirección

1. **Authentication** → **URL Configuration**.
2. **Site URL**: dominio de producción:
   ```
   https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app
   ```
3. **Redirect URLs**: añade estas URLs (una por línea):
   ```
   https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app/panel
   https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app/verificar-email
   https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app/nueva-contrasena
   http://localhost:3000/panel
   http://localhost:3000/verificar-email
   http://localhost:3000/nueva-contrasena
   ```
   - Tras **confirmar el email**, Supabase redirige a la primera (o a la que tengas como Site URL + path por defecto; si hace falta, en la plantilla de email puedes usar `{{ .ConfirmationURL }}` que Supabase reemplaza).
   - El enlace de **recuperar contraseña** debe llevar a `/nueva-contrasena` (ya configurado en la app).

---

## 3. Plantillas de email en español

1. **Authentication** → **Email Templates**.
2. Para cada plantilla que uses, cambia el texto al español:

### Confirm signup (Confirmar registro)
- **Subject**: `Confirma tu cuenta - Fuente Palmera Pádel`
- **Body**: texto en español indicando que debe hacer clic en el enlace para activar la cuenta. Usa `{{ .ConfirmationURL }}` como enlace.

### Reset password (Recuperar contraseña)
- **Subject**: `Restablece tu contraseña - Fuente Palmera Pádel`
- **Body**: texto en español indicando que ha solicitado cambiar la contraseña y que debe hacer clic en el enlace. Usa `{{ .ConfirmationURL }}` (o el equivalente que ofrezca la plantilla) como enlace; ese enlace debe apuntar a tu dominio y path `/nueva-contrasena` si Supabase lo permite configurar).

Si en la plantilla solo aparece una URL genérica, asegúrate de que en **Redirect URLs** esté `https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app/nueva-contrasena` para que el enlace de “reset password” abra esa ruta.

---

## 4. Resumen de rutas de la app

| Ruta | Uso |
|------|-----|
| `/registro` | Alta; tras registrarse → redirige a `/verificar-email` |
| `/verificar-email` | Mensaje “Revisa tu bandeja y haz clic en el enlace”; sin email confirmado no se puede entrar al panel |
| `/login` | Enlace “¿Olvidaste tu contraseña?” → `/recuperar-contraseña` |
| `/recuperar-contraseña` | Formulario con email; Supabase envía correo con enlace |
| `/nueva-contrasena` | Formulario nueva contraseña (enlace del email); tras guardar → `/login?password-reset=success` |

---

## 5. Envío de correos (SendGrid)

Para no depender del límite de Supabase, configura SMTP con SendGrid: **[SENDGRID-SUPABASE.md](./SENDGRID-SUPABASE.md)**.
