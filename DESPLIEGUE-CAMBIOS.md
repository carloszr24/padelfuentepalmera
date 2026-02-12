# Cómo desplegar los cambios (webhook monedero, etc.)

Si ya tienes el proyecto en **GitHub** y en **Vercel**, basta con subir los cambios y Vercel desplegará solo.

---

## Opción A: Desde la terminal (recomendado)

En la carpeta del proyecto ejecuta:

```bash
git add .
git status
```

Revisa que aparezcan los archivos modificados (webhook, checkout, STRIPE.md, SUPABASE.md, verificar-monedero.sql, etc.). Luego:

```bash
git commit -m "Webhook: recuperar sesión si falta metadata, client_reference_id, GET diagnóstico"
git push origin main
```

Vercel detectará el push y hará un **nuevo deploy automáticamente**. En 1–2 minutos estará listo.

- Para ver el progreso: **[vercel.com](https://vercel.com)** → tu proyecto → **Deployments**.
- Cuando el estado sea **Ready**, los cambios ya están en producción.

---

## Opción B: Redeploy manual (sin cambiar código)

Si no quieres hacer commit ahora pero sí quieres que Vercel use el último código que ya subiste:

1. Entra en **[vercel.com](https://vercel.com)** → tu proyecto.
2. Pestaña **Deployments**.
3. En el último deployment, clic en los **tres puntos** (⋮) → **Redeploy**.
4. Confirma.

Eso vuelve a desplegar el último commit de `main`. Si los cambios nuevos **no** están en GitHub, redeploy no los incluirá; en ese caso usa la **Opción A**.

---

## Después del deploy

1. **Comprobar que el webhook responde:**  
   Abre en el navegador: `https://TU-URL.vercel.app/api/stripe/webhook`  
   Debe devolver JSON: `{"ok":true,"message":"Webhook endpoint..."}`.

2. **Probar una recarga** con tarjeta test `4242 4242 4242 4242` y revisar en Vercel → **Logs** si aparece `Webhook: wallet_recharge OK` o algún error.

3. Si cambiaste **variables de entorno** en Vercel (por ejemplo `STRIPE_WEBHOOK_SECRET`), haz un **Redeploy** para que las use el nuevo build.
