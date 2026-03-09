# Integración TPV Cecabank – Según manual oficial

Todo el código de esta integración sigue el **manual de integración TPV Virtual Cecabank** (referencias a secciones cuando las tenemos). Si Ceca te proporciona una versión concreta (ej. v8.27, v8.31), úsala como fuente de verdad.

---

## 1. Resumen del flujo

1. Usuario elige importe en el modal de recarga y pulsa "Pagar".
2. Nuestra API genera los campos del formulario y la firma según el manual.
3. El navegador envía un **POST** (formulario) a la URL del TPV de Ceca (`compra.action`).
4. El usuario paga en la pantalla de Ceca y Ceca redirige a nuestras URLs (OK/NOK).
5. Ceca hace una **comunicación on-line** (POST) a nuestra URL de callback con el resultado.
6. Nosotros validamos la firma, acreditamos el monedero y respondemos `$*OKY*$` o `$*NOK*$`.

---

## 2. URLs (manual)

- **Pruebas:** `https://tpv.ceca.es/tpvweb/tpv/compra.action`
- **Producción:** `https://pgw.ceca.es/tpvweb/tpv/compra.action`

Solo usar URLs de dominio Ceca (tpv.ceca.es / pgw.ceca.es), no Redsys.

---

## 3. Parámetros del formulario de pago (checkout)

Según el manual (tabla de parámetros de entrada):

| Parámetro     | Descripción |
|---------------|-------------|
| MerchantID    | Código comercio (te lo da Ceca) |
| AcquirerBIN   | (te lo da Ceca) |
| TerminalID    | Terminal, **8 dígitos** (ej. 00000003) |
| Num_operacion | Identificador único de la operación (máx. 50 caracteres; en muchos entornos solo numérico, 12 dígitos) |
| Importe       | **Sin decimales ni ceros a la izquierda**: los dos últimos dígitos son céntimos (10 € = 1000) |
| TipoMoneda    | 978 (euros) |
| Exponente     | 2 |
| URL_OK        | URL de retorno si pago correcto |
| URL_NOK       | URL de retorno si error/cancelación |
| Firma         | Ver apartado de firma |
| Cifrado       | SHA2 o HMAC (recomendado HMAC) |
| Idioma        | 1 |
| Descripcion   | Opcional; podemos enviar JSON con user_id y amount para el callback |

**Changelog v8.27:** se eliminaron `Pago_soportado` y `Pago_elegido` del formulario. No enviarlos.

---

## 4. Firma del checkout (envío al TPV)

### 4.1 Cadena a firmar (orden exacto del manual)

```
Clave + MerchantID + AcquirerBIN + TerminalID + Num_operacion + Importe + TipoMoneda + Exponente + Cifrado + URL_OK + URL_NOK
```

- **Importe:** mismo valor que en el formulario (sin ceros a la izquierda, 10 € = 1000).

### 4.2 Cifrado SHA2 (manual)

- Algoritmo: SHA-256 sobre la cadena (UTF-8).
- Resultado: **hexadecimal en minúsculas** (64 caracteres).

### 4.3 Cifrado HMAC (manual, sección 3.2.2)

1. **Clave para HMAC:** La clave del comercio (32 caracteres) se interpreta como **Base64** y se decodifica → **24 bytes**. Esos 24 bytes son la clave simétrica para el siguiente paso.
2. **Cifrado 3DES:** Con esa clave de 24 bytes, se cifra el valor de **Num_operacion** con **Triple DES en modo CBC**, IV = ceros (8 bytes), y **padding manual con ceros** hasta que la longitud sea múltiplo de 8 bytes. El resultado de este cifrado es la **clave real** del HMAC.
3. **HMAC-SHA256:** Se calcula HMAC-SHA256 de la **cadena a firmar** (la misma que en 4.1) usando como clave el resultado del paso anterior.
4. **Salida:** La firma se devuelve en **Base64**.

Ejemplo de verificación (si el manual incluye uno): clave, Num_operacion y cadena → firma Base64 concreta.

---

## 5. Comunicación on-line (webhook)

- Ceca envía un **POST** con `Content-Type: application/x-www-form-urlencoded` a la URL que configures en su back office (ej. `https://tudominio.com/api/ceca/callback`).
- **Manual 3.3.1 – Respuesta requerida:** Si en el portal de Ceca tienes activada la opción de “comunicación on-line con respuesta requerida”, **debes responder exactamente** en un tiempo máximo de 30 segundos:
  - **`$*OKY*$`** → operación correcta y actualizada en tu base de datos.
  - **`$*NOK*$`** → operación incorrecta; el TPV anulará la operación.
  - Cualquier otro valor o timeout → por defecto la operación será anulada.

### 5.1 Firma del webhook (manual)

- La firma en la comunicación on-line se calcula **siempre con SHA2** (SHA-256 hex), aunque en el checkout hayas usado HMAC.

**Cadena a firmar (orden exacto):**

```
Clave + MerchantID + AcquirerBIN + TerminalID + Num_operacion + Importe + TipoMoneda + Exponente + Referencia
```

- **Importe:** En el webhook el campo Importe viene con **longitud fija de 12 dígitos**, relleno con ceros a la izquierda (ej. 10 € → `000000001000`). Se usa tal cual en la cadena para validar la firma.

### 5.2 Parámetros que envía Ceca (entre otros)

- MerchantID, AcquirerBIN, TerminalID, Num_operacion, Importe (12 dígitos), TipoMoneda, Exponente, **Referencia**, Firma, Descripcion (si la enviaste), etc.

---

## 6. Variables de entorno

| Variable | Uso |
|----------|-----|
| CECA_MERCHANT_ID | Código comercio |
| CECA_ACQUIRER_BIN | Acquirer BIN |
| CECA_TERMINAL | Terminal (8 dígitos) |
| CECA_SECRET_KEY | Clave para firmar (32 caracteres) |
| CECA_URL | (Opcional) URL del TPV si Ceca te da una distinta |
| CECA_USE_HMAC | 1 = usar HMAC en checkout; 0 o no definido = SHA2 |
| CECA_ENV | test | production (para elegir URL por defecto) |
| NEXT_PUBLIC_SITE_URL | URL base de tu web (para URL_OK / URL_NOK) |

En Ceca (portal) debes configurar la **URL de comunicación on-line** apuntando a tu callback (ej. `https://tudominio.com/api/ceca/callback`) y, si aplica, activar **respuesta requerida = SÍ**.

---

## 7. Tabla auxiliar (recomendada)

Para que el callback sepa a qué usuario e importe corresponde cada `Num_operacion`, se puede usar una tabla `wallet_operations_pending`: el checkout inserta una fila al generar el pago; el callback la consulta por `Num_operacion` y obtiene `user_id` y `amount_euros`. Si no existe la tabla o la fila, el callback puede usar el JSON del campo `Descripcion` como respaldo.

Script SQL: `supabase/wallet_operations_pending.sql`.
