# Stripe CLI en local – paso a paso

Para que el saldo del monedero se actualice al pagar **sin desplegar la app**, Stripe tiene que poder llamar a tu API. Como `localhost` no es accesible desde internet, usas el **Stripe CLI**: hace de túnel y reenvía los eventos de Stripe a tu máquina.

---

## Paso 1: Instalar Stripe CLI (sin Homebrew)

**Opción A – Descargar desde GitHub (recomendado si no tienes Homebrew):**

1. Abre en el navegador: **https://github.com/stripe/stripe-cli/releases/latest**

2. En **Assets**, descarga el archivo que corresponda a tu Mac:
   - **Mac con chip M1/M2/M3 (Apple Silicon):** `stripe_*_mac-os_arm64.tar.gz`
   - **Mac con Intel:** `stripe_*_mac-os_x86_64.tar.gz`  
   (Si no sabes cuál: en Terminal escribe `uname -m`. Si sale `arm64` → arm64; si sale `x86_64` → x86_64.)

3. En la Terminal, ve a la carpeta de Descargas y descomprime (cambia el nombre del `.tar.gz` si es distinto):
   ```bash
   cd ~/Downloads
   tar -xzf stripe_1.35.0_mac-os_arm64.tar.gz
   ```
   (Usa el nombre real del archivo que descargaste; si es Intel, será `mac-os_x86_64`.)

4. Mueve el ejecutable a un sitio que use tu sistema (así podrás usar `stripe` desde cualquier carpeta):
   ```bash
   sudo mv stripe /usr/local/bin/
   ```
   Te pedirá la contraseña de tu Mac.

5. Comprueba:
   ```bash
   stripe --version
   ```
   Deberías ver algo como `stripe version 1.x.x`.

**Opción B – Con Homebrew** (si más adelante lo instalas):

```bash
brew install stripe/stripe-cli/stripe
```

---

## Paso 2: Iniciar sesión en Stripe (solo la primera vez)

En la Terminal:

```bash
stripe login
```

- Se abrirá el navegador.
- Inicia sesión en tu cuenta de Stripe (o crea una).
- Autoriza el CLI cuando te lo pida.
- Vuelve a la Terminal; debería decir que el login fue correcto.

---

## Paso 3: Arrancar tu app

En una terminal, dentro de la carpeta del proyecto:

```bash
cd /Users/carloszamoraruiz/Desktop/fuente-palmera-padel
npm run dev
```

Deja esta terminal abierta (el servidor tiene que estar en marcha).

---

## Paso 4: Arrancar el túnel del webhook (otra terminal)

Abre **otra** ventana/pestaña de la Terminal. En la misma carpeta del proyecto:

```bash
cd /Users/carloszamoraruiz/Desktop/fuente-palmera-padel
npm run stripe:webhook
```

Verás algo así:

```
> stripe listen --forward-to localhost:3000/api/stripe/webhook

Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**No cierres esta terminal.** Tiene que seguir ejecutándose mientras quieras recibir webhooks.

---

## Paso 5: Copiar el secret al .env.local

- Copia **solo** la parte `whsec_...` (todo el valor que te ha salido después de “signing secret is”).
- Abre el archivo `.env.local` del proyecto.
- Busca la línea `STRIPE_WEBHOOK_SECRET=...`.
- Pega el valor:

  ```env
  STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

- Si no existe esa línea, añádela (sin comillas).
- Guarda el archivo.

---

## Paso 6: Reiniciar el servidor Next

En la terminal donde está `npm run dev`:

- Pulsa **Ctrl + C** para parar el servidor.
- Vuelve a arrancarlo:

  ```bash
  npm run dev
  ```

Así carga el nuevo `STRIPE_WEBHOOK_SECRET`.

---

## Paso 7: Probar el pago

1. Abre el navegador en **http://localhost:3000**
2. Inicia sesión en tu app.
3. Ve a **Panel** → **Monedero**.
4. Pulsa **“Recargar monedero”**.
5. Elige una cantidad (ej. 10 €) y **“Pagar X €”**.
6. En la página de Stripe usa la tarjeta de prueba:
   - Número: **4242 4242 4242 4242**
   - Fecha: **12/34**
   - CVC: **123**
7. Completa el pago.

Al volver a la app, el **saldo** debería haberse actualizado. En la terminal donde está `npm run stripe:webhook` verás que llegó un evento (por ejemplo `checkout.session.completed`).

---

## Resumen rápido

| Terminal 1        | Terminal 2              |
|-------------------|-------------------------|
| `npm run dev`     | `npm run stripe:webhook`|
| (servidor Next)   | (túnel Stripe → local)  |

Las dos tienen que estar abiertas mientras pruebas. El secret `whsec_...` va en `.env.local` como `STRIPE_WEBHOOK_SECRET`.
