/**
 * Firmas TPV Cecabank según manual.
 * - Checkout: SHA2 (hex) o HMAC (Base64), sección 3.2.2.
 * - Webhook: siempre SHA2 (hex).
 */

import { createHash, createHmac, createCipheriv, timingSafeEqual } from 'node:crypto';

/** SHA2: SHA-256 de la cadena, resultado en hexadecimal minúsculas (manual). */
export function generateSignature(cadena: string): string {
  return createHash('sha256').update(cadena, 'utf8').digest('hex').toLowerCase();
}

/**
 * Clave HMAC según manual 3.2.2:
 * 1) Clave comercio (32 chars) → decodificar como Base64 → 24 bytes.
 * 2) Cifrar Num_operacion con 3DES CBC (IV ceros, padding ceros a múltiplo de 8).
 * 3) Ese resultado es la clave del HMAC-SHA256.
 */
function deriveHmacKey(secretKey: string, numOperacion: string): Buffer {
  const claveBin = Buffer.from(secretKey, 'base64');
  const key24 =
    claveBin.length === 24
      ? claveBin
      : (() => {
          const utf8 = Buffer.from(secretKey, 'utf8');
          return utf8.length >= 24
            ? utf8.subarray(0, 24)
            : Buffer.concat([utf8, Buffer.alloc(24 - utf8.length, 0)]);
        })();
  const iv = Buffer.alloc(8, 0);
  const plain = Buffer.from(numOperacion, 'utf8');
  const padLen = 8 * Math.ceil(plain.length / 8) || 8;
  const padded = Buffer.alloc(padLen, 0);
  plain.copy(padded);
  const cipher = createCipheriv('des-ede3-cbc', key24, iv);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(padded), cipher.final()]);
}

/**
 * Firma HMAC para checkout (manual 3.2.2).
 * Cadena = Clave + MerchantID + ... + Cifrado + URL_OK + URL_NOK.
 * Resultado en Base64.
 */
export function generateSignatureHmac(
  secretKey: string,
  numOperacion: string,
  cadena: string
): string {
  const hmacKey = deriveHmacKey(secretKey, numOperacion);
  return createHmac('sha256', hmacKey).update(cadena, 'utf8').digest('base64');
}

/** Valida firma SHA2 del webhook con comparación timing-safe para evitar ataques de temporización. */
export function validateSignature(cadena: string, firmaRecibida: string): boolean {
  if (!firmaRecibida) return false;
  const esperada = generateSignature(cadena);
  try {
    const a = Buffer.from(esperada.toLowerCase(), 'utf8');
    const b = Buffer.from(firmaRecibida.toLowerCase(), 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
