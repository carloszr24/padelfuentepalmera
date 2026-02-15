# Configurar SendGrid con Supabase para enviar correos

Supabase tiene un límite bajo de emails por hora con su SMTP por defecto. Para recuperación de contraseña, registro y demás correos de autenticación es mejor usar **SendGrid** (u otro proveedor SMTP).

---

## 1. Crear cuenta y API Key en SendGrid

1. Entra en **[sendgrid.com](https://sendgrid.com)** y crea una cuenta (o inicia sesión).
2. Ve a **Settings** → **API Keys**.
3. **Create API Key**: ponle un nombre (ej. "Supabase Auth") y elige **Restricted Access** o **Full Access** (para SMTP suele bastar con permisos de "Mail Send").
4. Copia la API Key y **guárdala** (solo se muestra una vez).

---

## 2. Verificar remitente (Sender) en SendGrid

Para que los correos no caigan en spam, SendGrid exige verificar un remitente:

1. En SendGrid: **Settings** → **Sender Authentication**.
2. **Verify a Single Sender**: añade `info@padelfuentepalmera.com` (o **Domain Authentication** con el dominio `padelfuentepalmera.com` si prefieres configurar DNS).
3. Completa la verificación (email de confirmación o DNS si usas dominio).

Anota el **email verificado**; lo usarás como "From" en Supabase.

---

## 3. Configurar SMTP en Supabase

1. Entra en **[Supabase Dashboard](https://supabase.com/dashboard)** → tu proyecto.
2. Menú **Authentication** → **SMTP** (o **Providers** → **Email** → Custom SMTP, según la versión del dashboard).
3. Activa **Custom SMTP** y rellena:

| Campo | Valor |
|--------|--------|
| **Sender email** | `info@padelfuentepalmera.com` (el verificado en SendGrid) |
| **Sender name** | `Fuente Palmera Pádel` |
| **Host** | `smtp.sendgrid.net` |
| **Port** | `587` |
| **Username** | `apikey` (literalmente la palabra "apikey", no tu API key) |
| **Password** | Tu API Key de SendGrid (la de 69 caracteres) |

4. Guarda los cambios.

---

## 4. Comprobar que funciona

- En tu app, ve a **Recuperar contraseña** e introduce un email de prueba.
- Revisa la bandeja (y spam); deberías recibir el correo de Supabase usando SendGrid.

---

## 5. Límites y buenas prácticas

- **SendGrid**: plan gratuito suele tener un límite diario (p. ej. 100 emails/día). Para más volumen, plan de pago.
- **Supabase**: al usar SMTP custom, aplica un límite por defecto (p. ej. 30 emails/hora). Puedes subirlo en **Authentication** → **Rate Limits** si lo necesitas.
- **Dominio**: el remitente es `info@padelfuentepalmera.com`. Si configuras **Domain Authentication** en SendGrid con `padelfuentepalmera.com` y los registros DNS (DKIM/SPF), mejora la entrega y evita “via sendgrid.net”.

---

## Resumen rápido

1. SendGrid: crear API Key y verificar remitente.
2. Supabase → Authentication → SMTP: Host `smtp.sendgrid.net`, Port `587`, User `apikey`, Password = API Key, Sender = email verificado.
3. Probar con "Recuperar contraseña" en la app.
