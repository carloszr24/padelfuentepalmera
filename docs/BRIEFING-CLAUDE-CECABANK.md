# Briefing para Claude: integración TPV Cecabank

Copia y pega todo este documento en el chat con Claude para que tenga contexto completo.

---

## 1. Contexto del proyecto

- **Stack:** Next.js (App Router), Vercel (hosting), Supabase (auth + DB).
- **Dominio:** padelfuentepalmera.com (con www en producción).
- **Objetivo:** Que los usuarios puedan **recargar el monedero** pagando con tarjeta a través del TPV virtual de **Cecabank** (no Redsys genérico; es el TPV de Cecabank con su manual propio).

---

## 2. Flujo que debe funcionar

1. Usuario entra en **Panel → Monedero** y pulsa **Recargar monedero**.
2. Se abre un **modal** donde elige cantidad (10 €, 20 €, etc.) y pulsa **Pagar X €**.
3. El frontend llama a un **endpoint backend** que genera los parámetros firmados del TPV.
4. El frontend construye un **formulario HTML** con esos parámetros y hace **POST** al TPV de Cecabank (redirección del usuario).
5. El usuario **paga en la página de Cecabank** (tarjeta de prueba en entorno test).
6. Cecabank envía una **notificación (callback)** por POST a nuestro backend con el resultado.
7. Nuestro backend **valida la firma**, acredita el saldo con `wallet_recharge` (RPC en Supabase) y responde a Ceca `$*$OKY$*$` o `$*$NOK$*$`.
8. Cecabank **redirige al usuario** a nuestra URL de éxito o error. Páginas ya existentes:
   - **Éxito:** `/panel/monedero/exito?order=...&amount=...&user_id=...`
   - **Error:** `/panel/monedero?error=1`

---

## 3. Lo que ya está implementado

### Backend

- **POST `/api/ceca/create-payment`**  
  Recibe `{ amount, origin? }`, comprueba usuario autenticado, genera firma y parámetros con `/lib/cecabank`, devuelve `{ formAction, formFields }`.  
  Las URLs de vuelta (URL_OK, URL_NOK) apuntan a las páginas existentes de monedero.

- **POST `/api/ceca/callback`**  
  Recibe el POST de Cecabank (form-data), valida firma con `/lib/cecabank`, parsea `Descripcion` (user_id, amount), llama a `supabase.rpc('wallet_recharge', ...)` y responde `$*$OKY$*$` o `$*$NOK$*$`.  
  GET en la misma ruta devuelve un texto para no dar 405 al abrir la URL en el navegador.

- **GET `/api/ceca/status`**  
  Devuelve si las variables CECA_* están definidas (sin mostrar valores), para diagnóstico.

### Librería `/lib/cecabank/`

- **signature.ts:** `generateSignature(cadena)` (SHA256 hex), `validateSignature(cadena, firmaRecibida)`.
- **config.ts:** `getCecaConfig()`, `isCecaConfigured()`, `formAction` según `CECA_ENV` o `CECA_URL`.
- **params.ts:** `buildPaymentParams({ amount, numOperacion, urlOk, urlNok, descripcion })` → `{ formAction, formFields }`.  
  Cadena de firma (checkout): `Clave + MerchantID + AcquirerBIN + TerminalID + Num_operacion + Importe + TipoMoneda + Exponente + Cifrado + URL_OK + URL_NOK`.
- **callback.ts:** `parseCallbackFormData(get)`, `validateCallbackSignature(data)`.  
  Cadena de firma (callback): `Clave + MerchantID + AcquirerBIN + TerminalID + Num_operacion + Importe (12 dígitos) + TipoMoneda + Exponente + Referencia`.

### Frontend

- **Modal de recarga:** `src/components/ui/wallet-modal.tsx`.  
  Al pulsar Pagar: llama a `/api/ceca/create-payment`; si responde 503, hace fallback a `/api/redsys/checkout`.  
  Con la respuesta correcta, crea un `<form>` con `formAction` y `formFields` y hace `form.submit()` para redirigir al TPV.

### Variables de entorno (Vercel)

- `CECA_MERCHANT_ID` (código comercio, ej. 213548837)
- `CECA_ACQUIRER_BIN` (ej. 0000554013)
- `CECA_TERMINAL` (ej. 00000003)
- `CECA_SECRET_KEY` (clave de encriptación que da Ceca)
- `CECA_ENV` = `test` o `production` (elige URL TPV: tpv.ceca.es vs pgw.ceca.es)
- `CECA_URL` (opcional): si Ceca da una URL de pruebas distinta, se usa esta.

En Ceca, en **Configuración Comunicación online**, la **URL online OK** debe ser:  
`https://www.padelfuentepalmera.com/api/ceca/callback`

---

## 4. Problemas / lo que hay que solucionar

- **404 en compra.action:** Al enviar el formulario al TPV a veces se recibe 404. Posibles causas según documentación: URL de pruebas distinta para el comercio, comercio/terminal no activos en pruebas, o algún parámetro obligatorio vacío (MerchantID, AcquirerBIN, TerminalID, Num_operacion, Importe, TipoMoneda, Exponente, Firma). Hay que comprobar en DevTools → Network → Form Data que ningún campo relevante vaya vacío y que la URL del TPV sea la correcta (consola de Ceca o `CECA_URL`).
- **WebSocket localhost:8081:** En algunos entornos aparece en consola "WebSocket connection to 'ws://localhost:8081/' failed". Es típico del Hot Reload de Next.js en desarrollo; en producción (Vercel) no debería afectar al pago. No es lo prioritario para que el TPV funcione.
- **Objetivo final:** Que el flujo completo funcione en producción (o en pruebas con CECA_ENV=test): usuario paga en Ceca, Ceca llama al callback, se acredita el saldo y el usuario vuelve a la página de éxito existente.

---

## 5. Archivos clave para revisar

- `src/lib/cecabank/` — firma, config, params, callback (validación).
- `src/app/api/ceca/create-payment/route.ts` — preparación del pago y URLs de vuelta.
- `src/app/api/ceca/callback/route.ts` — recepción del callback y `wallet_recharge`.
- `src/components/ui/wallet-modal.tsx` — llamada a create-payment y envío del form al TPV.
- `docs/CECABANK-INTEGRACION.md` — documentación de la integración y variables.

---

## 6. Credenciales / datos de referencia (sin secretos)

- Comercio: PADEL FUENTE PALMERA.
- Usuario TPV / código comercio: 213548837.
- Consola pruebas: https://comercios.ceca.es/pruebas
- Consola producción: https://comercios.ceca.es  
- La clave secreta (CECA_SECRET_KEY) no se comparte; debe estar solo en variables de entorno.

---

## 7. Lo que necesito que hagas

1. Revisar la integración actual (lib/cecabank, create-payment, callback, wallet-modal) y el manual de Cecabank si lo tengo a mano, para asegurar que firma, parámetros y callback son correctos.
2. Ayudar a diagnosticar el 404 en compra.action: qué comprobar en Form Data, URL del TPV y variables de entorno.
3. Proponer cambios concretos (código o configuración) para que el pago funcione de punta a punta (redirección a Ceca → pago → callback → saldo actualizado → redirección a éxito/error).
4. No crear nuevas páginas de éxito/error; usar las ya existentes (`/panel/monedero/exito` y `/panel/monedero?error=1`).
5. Mantener compatibilidad con Vercel (serverless) y no romper el flujo actual del resto de la app.

Si necesitas el manual de Cecabank (parámetros de firma, nombres de campos, formato de la comunicación on-line), dímelo y lo adjunto o lo describo.
