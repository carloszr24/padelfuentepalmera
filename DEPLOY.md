# Desplegar Fuente Palmera Pádel (Vercel)

## 1. Subir el código a GitHub

Si aún no está en GitHub:

```bash
# Crea un repo en github.com (ej: fuente-palmera-padel) y luego:
git remote add origin https://github.com/TU_USUARIO/fuente-palmera-padel.git
git branch -M main
git push -u origin main
```

Si ya usas Git pero no has subido: `git push origin main`.

---

## 2. Crear proyecto en Vercel

1. Entra en **[vercel.com](https://vercel.com)** e inicia sesión (con GitHub).
2. **Add New…** → **Project**.
3. **Import** el repo `fuente-palmera-padel` (conectar GitHub si te lo pide).
4. **Framework Preset**: Next.js (debería detectarlo).
5. **Root Directory**: dejar por defecto.
6. No hagas **Deploy** todavía; antes configura las variables de entorno.

---

## 3. Variables de entorno en Vercel

En el proyecto → **Settings** → **Environment Variables**. Añade estas (mismo nombre que en `.env.local`):

| Nombre | Valor | Notas |
|--------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | (tu URL de Supabase) | Copia de .env.local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (tu anon key) | Copia de .env.local |
| `SUPABASE_SERVICE_ROLE_KEY` | (tu service role key) | Copia de .env.local |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | (pk_test_... o pk_live_...) | Test o live según quieras |
| `STRIPE_SECRET_KEY` | (sk_test_... o sk_live_...) | Mismo modo que la publishable |
| `STRIPE_WEBHOOK_SECRET` | (lo verás en el paso 4) | **No** uses el de local |
| `NEXT_PUBLIC_URL` | `https://tu-dominio.vercel.app` | Tras el primer deploy, sustituye por tu URL real |

Marca las tres casillas (Production, Preview, Development) para cada variable y guarda.

---

## 4. Webhook de Stripe para producción

Cuando tengas la URL de Vercel (ej: `https://fuente-palmera-padel.vercel.app`):

1. Entra en **[Stripe Dashboard](https://dashboard.stripe.com)** → **Developers** → **Webhooks**.
2. **Add endpoint**.
3. **Endpoint URL**: `https://TU-URL-VERCEL.vercel.app/api/stripe/webhook`
4. Eventos a escuchar: marca **checkout.session.completed** (o los que use tu app).
5. Crea el endpoint. En **Signing secret** → **Reveal** y copia el valor (`whsec_...`).
6. Pégalo en Vercel como valor de **STRIPE_WEBHOOK_SECRET** (y vuelve a desplegar si ya habías desplegado).

---

## 5. Primer deploy

1. En Vercel, ve a **Deployments** y haz **Redeploy** del último, o lanza un deploy desde la pestaña del proyecto (Deploy).
2. O desde tu repo: `git push origin main` y Vercel desplegará solo.

Cuando termine, tendrás una URL tipo:  
`https://fuente-palmera-padel-xxx.vercel.app`

---

## 6. Actualizar NEXT_PUBLIC_URL (y Stripe)

1. En Vercel → **Settings** → **Environment Variables**, edita **NEXT_PUBLIC_URL** y pon tu URL real, ej:  
   `https://fuente-palmera-padel-xxx.vercel.app`
2. Si usas dominio propio más adelante, cámbiala a esa (ej: `https://fuentepalmerapadel.com`).
3. **Redeploy** para que la app use la nueva URL (importante para Stripe redirects y enlaces).

---

## 7. Probar en móvil

Abre la URL de Vercel en el móvil (misma WiFi o datos). Comprueba:

- Landing, registro, login.
- Panel: reservas, monedero.
- Si usas Stripe en test: recarga con tarjeta `4242 4242 4242 4242`.

---

## Resumen rápido

1. Código en GitHub.
2. Proyecto en Vercel importando ese repo.
3. Añadir todas las env vars (sin el webhook secret todavía).
4. Deploy → obtener URL.
5. Crear webhook en Stripe con esa URL → copiar `STRIPE_WEBHOOK_SECRET` → ponerlo en Vercel.
6. Poner `NEXT_PUBLIC_URL` = URL de Vercel (o tu dominio) y redeploy.

A partir de ahí, cada `git push origin main` generará un nuevo deploy automático.
