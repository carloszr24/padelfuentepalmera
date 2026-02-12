# Configuración de Stripe (recarga monedero)

La recarga del monedero usa **Stripe Checkout** y un **webhook** para acreditar el saldo cuando el pago se completa.

---

## 1. Variables de entorno

En `.env.local` (o en tu hosting) necesitas:

```env
# Claves de Stripe (Dashboard → Developers → API keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # opcional si no muestras elementos Stripe en el cliente
STRIPE_SECRET_KEY=sk_test_...

# Secreto del webhook (lo obtienes al crear el webhook en Stripe)
STRIPE_WEBHOOK_SECRET=whsec_...

# URL de la app (para success/cancel y para que Stripe llame al webhook)
NEXT_PUBLIC_URL=https://tu-dominio.com
```

En local: `NEXT_PUBLIC_URL=http://localhost:3000`.

---

## 2. Webhook en Stripe Dashboard

Para que el saldo se actualice al completar el pago, Stripe tiene que llamar a tu API.

### En producción

1. Entra en [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**.
2. **Add endpoint**.
3. **Endpoint URL:**  
   `https://tu-dominio.com/api/stripe/webhook`
4. **Eventos:** selecciona **checkout.session.completed** (o “Checkout session completed”).
5. Guarda. En la ficha del endpoint verás **Signing secret** (empieza por `whsec_...`).  
   **Copia ese valor** y ponlo en Vercel como **STRIPE_WEBHOOK_SECRET** (Settings → Environment Variables).  
   **Importante:** en producción usa **siempre** el secret del endpoint de producción que acabas de crear, **no** el que te da `stripe listen` en local. Si en Vercel tienes el secret de local, el webhook fallará (firma inválida) y el saldo no se actualizará.

### En local (Stripe CLI)

Stripe no puede llamar a `localhost` directamente. Usa el CLI para reenviar los eventos:

1. Instala [Stripe CLI](https://stripe.com/docs/stripe-cli) (en macOS con Homebrew: `brew install stripe/stripe-cli/stripe`).
2. Inicia sesión (solo la primera vez): `stripe login`.
3. Con el servidor Next en marcha (`npm run dev`), en otra terminal ejecuta:
   ```bash
   npm run stripe:webhook
   ```
   (o `stripe listen --forward-to localhost:3000/api/stripe/webhook`).
4. El CLI mostrará un **webhook signing secret** (p. ej. `whsec_...`). Cópialo y pégalo en `.env.local` como `STRIPE_WEBHOOK_SECRET`.

---

## 3. Flujo de la recarga

1. El usuario en **Panel → Monedero** pulsa **Recargar monedero**, elige cantidad y confirma.
2. La app llama a `POST /api/stripe/checkout` con `{ "amount": 20 }` (mín. 10 €, máx. 500 €).
3. Se crea una sesión de Stripe Checkout y se redirige al usuario a Stripe para pagar.
4. Tras el pago, Stripe redirige a `NEXT_PUBLIC_URL/panel/monedero?success=1`.
5. Stripe envía el evento **checkout.session.completed** a `/api/stripe/webhook`.
6. El webhook verifica la firma, lee `userId` y `amount` de la metadata de la sesión y llama a la función Supabase `wallet_recharge`. El saldo y el historial se actualizan.

Si el usuario cancela en Stripe, vuelve a `/panel/monedero?cancel=1`.

---

## 4. Probar pagos (modo test)

Con las claves de **test** (`sk_test_...`, `pk_test_...`) Stripe no cobra dinero real. Usa estas tarjetas:

| Resultado        | Número           |
|------------------|------------------|
| Pago correcto    | `4242 4242 4242 4242` |
| Pago rechazado   | `4000 0000 0000 0002` |
| Requiere 3D Secure | `4000 0025 0000 3155` |

- **Fecha:** cualquier fecha futura (ej. 12/34).
- **CVC:** cualquier 3 dígitos (ej. 123).
- **Nombre:** el que quieras.

Pasos: inicia sesión → **Panel** → **Monedero** → **Recargar monedero** → elige cantidad → te redirige a Stripe → usa `4242 4242 4242 4242`. Si el webhook está configurado, al volver el saldo se habrá actualizado.

---

## 5. Resumen de rutas

| Ruta | Uso |
|------|-----|
| `POST /api/stripe/checkout` | Crea sesión Checkout (body: `{ "amount": number }`). Requiere usuario autenticado. |
| `GET /api/stripe/webhook` | Diagnóstico: devuelve JSON si la ruta existe (para comprobar que no devuelve HTML). |
| `POST /api/stripe/webhook` | Recibe eventos de Stripe. Solo debe ser llamada por Stripe (firma verificada). |

---

## 6. Si el saldo no se actualiza tras recargar

0. **Diagnóstico rápido (admin)**  
   Inicia sesión como **admin** y abre en el navegador:  
   `https://tu-dominio.com/api/admin/debug-wallet`  
   Verás si Stripe/Supabase están configurados y si la función **wallet_recharge** existe en Supabase. Sigue el **hint** que salga.

1. **Comprobar que la URL del webhook responde con JSON**  
   Abre en el navegador: `https://tu-dominio.com/api/stripe/webhook`  
   Debe verse algo como: `{"ok":true,"message":"Webhook endpoint. Stripe debe enviar POST con stripe-signature."}`  
   Si ves la landing (HTML), la petición no está llegando al API: revisa proxy/rewrites o que el deploy sea el correcto.

2. **Stripe Dashboard → Developers → Webhooks**  
   Entra en tu endpoint y mira los **eventos recientes**. Si el estado es "Failed" o la respuesta no es 200 con JSON, Stripe está recibiendo error o HTML. Revisa los logs en Vercel (o tu hosting) para ese momento.

3. **Logs del webhook**  
   En Vercel → proyecto → **Logs** (o **Functions**), filtra por la función del webhook. Busca:
   - `Webhook: wallet_recharge OK` → el webhook y Supabase han ido bien; si aun así no ves saldo, el problema es caché o que estás mirando otro usuario.
   - `Webhook: no userId` o `Metadata incompleta` → la sesión no trae `userId`/`amount`; el código ahora intenta recuperar la sesión y usar `client_reference_id` y `amount_total` como respaldo.
   - `wallet_recharge error:` → fallo en Supabase (función no existe, RLS, etc.). Revisa `SUPABASE.md` y ejecuta `supabase/verificar-monedero.sql`.

4. **Supabase**  
   Tras una recarga de prueba, en **Table Editor** mira la tabla **profiles** (campo `wallet_balance` del usuario) y **transactions** (última fila `type = recharge`). Si no hay fila nueva, el webhook no está llamando a `wallet_recharge` o está fallando antes.
