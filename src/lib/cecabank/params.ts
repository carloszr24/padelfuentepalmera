/**
 * Parámetros del formulario de pago (checkout) – según manual v8.31.
 * Cadena: Clave + MerchantID + AcquirerBIN + TerminalID + Num_operacion +
 * Importe + TipoMoneda + Exponente + Cifrado + URL_OK + URL_NOK.
 * v8.27: no enviar Pago_soportado ni Pago_elegido.
 * v8.27+: Cifrado solo acepta HMAC o HMAC-1; SHA2 no permitido en nuevos comercios.
 */

import { getCecaConfig } from './config';
import { generateSignatureHmac } from './signature';

export type BuildPaymentParamsInput = {
  amount: number;
  numOperacion: string;
  urlOk: string;
  urlNok: string;
  descripcion: Record<string, unknown>;
};

export function buildPaymentParams(input: BuildPaymentParamsInput): {
  formAction: string;
  formFields: Record<string, string>;
} | null {
  const config = getCecaConfig();
  if (
    !config.merchantId ||
    !config.acquirerBin ||
    !config.terminal ||
    !config.secretKey
  ) {
    return null;
  }

  const { amount, numOperacion, urlOk, urlNok, descripcion } = input;
  if (amount < 0.01) return null;

  const numOp = numOperacion.replace(/\D/g, '').padStart(12, '0').slice(-12);
  if (!numOp) return null;

  const importeCents = Math.round(amount * 100);
  const importeVal = importeCents.toString();

  // Manual v8.31 sección 3.2.2: Cifrado solo puede ser HMAC o HMAC-1.
  // SHA2 era método legacy y no está permitido en nuevos comercios.
  const cifrado = 'HMAC';

  const cadenaCompleta =
    config.secretKey +
    config.merchantId +
    config.acquirerBin +
    config.terminal +
    numOp +
    importeVal +
    '978' +
    '2' +
    cifrado +
    urlOk +
    urlNok;

  let firma: string;
  try {
    firma = generateSignatureHmac(config.secretKey, numOp, cadenaCompleta);
  } catch {
    return null;
  }

  const descripcionStr = JSON.stringify(descripcion);

  const rawFields: Record<string, string> = {
    MerchantID: config.merchantId,
    AcquirerBIN: config.acquirerBin,
    TerminalID: config.terminal,
    Num_operacion: numOp,
    Importe: importeVal,
    TipoMoneda: '978',
    Exponente: '2',
    URL_OK: urlOk,
    URL_NOK: urlNok,
    Firma: firma,
    Cifrado: cifrado,
    Idioma: '1',
    Descripcion: descripcionStr,
  };

  const formFields: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawFields)) {
    const s = typeof v === 'string' ? v : String(v);
    if (s.length > 0) formFields[k] = s;
  }

  return {
    formAction: config.formAction,
    formFields,
  };
}
