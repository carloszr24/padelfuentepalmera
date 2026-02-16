# Poner el dominio real en Vercel

Sustituye `tudominio.com` por tu dominio real (ej: `padelfuentepalmera.com`).

---

## 1. Añadir dominio en Vercel

1. Entra en **[vercel.com](https://vercel.com)** → tu proyecto **Fuente Palmera Pádel**.
2. **Settings** → **Domains**.
3. En el campo, escribe tu dominio:
   - `tudominio.com` (y opcionalmente `www.tudominio.com`).
4. **Add**.
5. Vercel te mostrará los **registros DNS** que debes crear en tu proveedor (IONOS, Cloudflare, etc.):
   - Normalmente un **A** o **CNAME** para el dominio raíz.
   - Si añades `www`, un **CNAME** de `www` apuntando a `cname.vercel-dns.com` (o el valor que indique Vercel).

---

## 2. Configurar DNS en IONOS

1. Entra en **[IONOS](https://www.ionos.com)** e inicia sesión.
2. Ve a **Dominios** (o **Domains**) y haz clic en tu dominio (ej: `tudominio.com`).
3. Abre la sección **DNS** / **Gestión de DNS** / **DNS Settings** (el nombre puede ser “Zona DNS”, “DNS” o “Manage DNS”).
4. Crea o edita estos registros:

   **Dominio raíz (tudominio.com sin www):**

   | Tipo | Nombre / Host | Valor / Apunta a | TTL (si lo pide) |
   |------|----------------|------------------|------------------|
   | **A** | `@` (o vacío, o tu dominio sin www) | `76.76.21.21` | 3600 o por defecto |

   - Si IONOS no acepta `@`, prueba dejando el nombre **vacío** o solo el dominio.
   - Si ya existe un registro **A** para `@`, **edítalo** y pon como valor/destino `76.76.21.21` (IP de Vercel).

   **Subdominio www:**

   | Tipo | Nombre / Host | Valor / Apunta a | TTL |
   |------|----------------|------------------|-----|
   | **CNAME** | `www` | `cname.vercel-dns.com` | 3600 o por defecto |

   - Sin `https://`, solo el texto `cname.vercel-dns.com`.
   - Si ya existe un CNAME para `www`, edítalo para que apunte a `cname.vercel-dns.com`.

5. **Guardar** los cambios en IONOS.
6. La propagación puede tardar **unos minutos hasta 24–48 h**. En Vercel → **Settings** → **Domains** verás un tick verde cuando el dominio esté verificado.

---

## 3. Variable de entorno en Vercel

1. **Settings** → **Environment Variables**.
2. Busca **NEXT_PUBLIC_URL**.
3. Edítala y pon **exactamente** la URL con la que quieres que se abra la app, por ejemplo:
   ```
   https://tudominio.com
   ```
   (o `https://www.tudominio.com` si usas www).
4. Guarda.
5. **Deployments** → menú (⋮) del último deploy → **Redeploy** para que la app use la nueva URL.

---

## 4. Supabase: Site URL y Redirect URLs

1. **[Supabase Dashboard](https://supabase.com/dashboard)** → tu proyecto → **Authentication** → **URL Configuration**.
2. **Site URL**: cámbiala a tu dominio real:
   ```
   https://tudominio.com
   ```
3. **Redirect URLs**: añade (o sustituye las de vercel.app por) estas, con tu dominio:
   ```
   https://tudominio.com/auth/callback
   https://tudominio.com/auth/callback?next=/nueva-contrasena
   https://tudominio.com/auth/callback?next=/panel
   https://tudominio.com/panel
   https://tudominio.com/nueva-contrasena
   https://tudominio.com/login
   ```
   Mantén también `http://localhost:3000/...` si sigues desarrollando en local.
4. Guarda.

---

## 5. Stripe (webhook y redirects)

1. **[Stripe Dashboard](https://dashboard.stripe.com)** → **Developers** → **Webhooks**.
2. Si ya tienes un endpoint con la URL de Vercel (`.vercel.app`), **edítalo** y cambia la URL a:
   ```
   https://tudominio.com/api/stripe/webhook
   ```
   O crea un **nuevo** endpoint con esa URL y, si quieres, desactiva el antiguo.
3. Si Stripe te pide una **URL de éxito/cancelación** en el checkout, usa:
   - Éxito: `https://tudominio.com/panel/monedero?success=1`
   - Cancelación: `https://tudominio.com/panel/monedero?cancel=1`

La app ya usa `NEXT_PUBLIC_URL` para construir redirects; tras el redeploy con el dominio en esa variable, Stripe redirigirá al dominio real.

---

## 6. Emails de Supabase (plantillas)

Si en las plantillas de email (verificación, recuperar contraseña) has puesto la URL de Vercel (`.vercel.app`), no hace falta cambiarla si usas `{{ .SiteURL }}`: Supabase usará la **Site URL** que configuraste en el paso 4. Solo revisa que **Site URL** en Supabase sea `https://tudominio.com`.

---

## Resumen

| Dónde        | Qué hacer |
|-------------|-----------|
| **Vercel**  | Añadir dominio en Domains; DNS en tu proveedor; `NEXT_PUBLIC_URL` = `https://tudominio.com`; Redeploy. |
| **Supabase**| Site URL y Redirect URLs con `https://tudominio.com`. |
| **Stripe**  | Webhook URL = `https://tudominio.com/api/stripe/webhook`. |

Cuando el DNS esté propagado y el redeploy termine, la app debería abrirse en `https://tudominio.com`.
