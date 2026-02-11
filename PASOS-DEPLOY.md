# Deploy paso a paso (GitHub + Vercel)

Tienes: cuenta GitHub + repo vacío creado.  
Objetivo: subir el código al repo y desplegar en Vercel.

---

## PARTE 1: Subir el código a GitHub

### Paso 1.1 – Abrir la terminal en la carpeta del proyecto

- En VS Code / Cursor: menú **Terminal** → **New Terminal** (o atajo `` Ctrl+` ``).
- O abre **Terminal** (Mac) / **Símbolo del sistema** (Windows) y escribe:
  ```bash
  cd /Users/carloszamoraruiz/Desktop/fuente-palmera-padel
  ```
  y pulsa Enter.

---

### Paso 1.2 – Ver la URL de tu repo en GitHub

1. Entra en **github.com** e inicia sesión.
2. Abre **tu repositorio** (el que creaste vacío).
3. Pulsa el botón verde **Code**.
4. En **HTTPS** verás una URL como:
   ```text
   https://github.com/MI_USUARIO/MI_REPO.git
   ```
   Anota **MI_USUARIO** y **MI_REPO** (o copia la URL entera).

---

### Paso 1.3 – Conectar tu carpeta con ese repo y subir

En la terminal (en la carpeta del proyecto), ejecuta **estos comandos uno por uno**.  
**Sustituye** `MI_USUARIO` y `MI_REPO` por tu usuario y nombre del repo:

```bash
git remote add origin https://github.com/MI_USUARIO/MI_REPO.git
```

```bash
git add .
```

```bash
git status
```
(Deberías ver muchos archivos en verde; es normal.)

```bash
git commit -m "Primer commit - app lista para deploy"
```

```bash
git branch -M main
```

```bash
git push -u origin main
```

- Si te pide **usuario y contraseña**:  
  - Usuario: tu usuario de GitHub.  
  - Contraseña: **no** uses la de GitHub; usa un **Personal Access Token**.  
    - Cómo crearlo: GitHub → tu foto (arriba derecha) → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**.  
    - Ponle un nombre (ej: "Vercel deploy"), marca **repo** y genera.  
    - Copia el token (solo se muestra una vez) y **pégalo como contraseña** cuando la terminal te la pida.

Cuando termine sin error, en GitHub (recarga la página del repo) deberías ver todos los archivos del proyecto.

---

## PARTE 2: Desplegar en Vercel

### Paso 2.1 – Entrar en Vercel

1. Abre el navegador y ve a **https://vercel.com**
2. Pulsa **Sign Up** o **Log In**
3. Elige **Continue with GitHub** e inicia sesión con tu cuenta de GitHub (autoriza si te lo pide)

---

### Paso 2.2 – Importar el proyecto

1. En la página principal de Vercel, pulsa **Add New…** → **Project**
2. Verás una lista de repositorios de GitHub. Busca **MI_REPO** (el nombre de tu repo)
3. Si no sale: pulsa **Configure GitHub App** o **Adjust GitHub App Permissions** y autoriza acceso a ese repo (o a todos)
4. Cuando veas tu repo, pulsa **Import** al lado

---

### Paso 2.3 – Configurar el proyecto (sin tocar builds)

1. En **Project Name** puedes dejarlo como está (o poner algo como `fuente-palmera-padel`)
2. **Framework Preset**: debe decir **Next.js** (no lo cambies)
3. **Root Directory**: déjalo vacío
4. **Build and Output Settings**: no cambies nada
5. **No hagas clic en Deploy todavía**; primero añadimos variables de entorno

---

### Paso 2.4 – Añadir variables de entorno

1. En la misma pantalla, busca la sección **Environment Variables**
2. Abre tu archivo **.env.local** en el proyecto (en Cursor/VS Code) y tendrás algo como:

   - NEXT_PUBLIC_SUPABASE_URL=...
   - NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   - SUPABASE_SERVICE_ROLE_KEY=...
   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
   - STRIPE_SECRET_KEY=...
   - STRIPE_WEBHOOK_SECRET=...
   - NEXT_PUBLIC_URL=...

3. En Vercel, **por cada línea** (una por una):
   - En **Key** escribe el nombre (ej: `NEXT_PUBLIC_SUPABASE_URL`)
   - En **Value** pega el valor (lo que va después del `=` en .env.local, sin espacios)
   - Marca las tres casillas: **Production**, **Preview**, **Development**
   - Pulsa **Add** o **Save**

4. Para **NEXT_PUBLIC_URL** de momento pon:
   ```text
   https://tu-proyecto.vercel.app
   ```
   (Más adelante lo cambiarás por la URL real que te dé Vercel.)

5. Para **STRIPE_WEBHOOK_SECRET**: de momento puedes poner el mismo que en .env.local; cuando tengas la URL de Vercel crearás un webhook nuevo en Stripe y cambiarás este valor (lo vemos después).

6. Cuando hayas añadido **todas** las variables, revisa que no falte ninguna.

---

### Paso 2.5 – Hacer el primer Deploy

1. Pulsa el botón **Deploy**
2. Espera 1–2 minutos. Verás un log de “Building…”
3. Cuando termine, verás **Congratulations!** y un enlace tipo:
   ```text
   https://fuente-palmera-padel-xxxx.vercel.app
   ```
4. **Abre ese enlace**: esa es tu web desplegada.

---

### Paso 2.6 – Poner la URL real en NEXT_PUBLIC_URL

1. En Vercel, entra en tu proyecto
2. Ve a **Settings** → **Environment Variables**
3. Busca **NEXT_PUBLIC_URL**, edítala y pon **exactamente** la URL que te dio Vercel (ej: `https://fuente-palmera-padel-xxxx.vercel.app`)
4. Guarda
5. Ve a **Deployments**, abre el menú (tres puntos) del último deploy y pulsa **Redeploy** para que la app use la nueva URL

---

### Paso 2.7 – Webhook de Stripe (para que funcionen los pagos)

1. En **Stripe** (dashboard.stripe.com): **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL**: pega tu URL de Vercel + `/api/stripe/webhook`  
   Ejemplo: `https://fuente-palmera-padel-xxxx.vercel.app/api/stripe/webhook`
3. En **Events to send**, añade **checkout.session.completed** (o el evento que use tu app)
4. Pulsa **Add endpoint**
5. En el nuevo webhook, abre **Signing secret** → **Reveal** y copia el valor (empieza por `whsec_...`)
6. En Vercel: **Settings** → **Environment Variables** → edita **STRIPE_WEBHOOK_SECRET** y pega ese nuevo valor → Guarda
7. **Deployments** → **Redeploy** del último deploy

Listo. A partir de aquí, cada vez que hagas `git push origin main`, Vercel desplegará solo.
