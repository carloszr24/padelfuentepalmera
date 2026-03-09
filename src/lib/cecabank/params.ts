/**
 * Parámetros del formulario de pago (checkout) – según manual.
 * Cadena: Clave + MerchantID + AcquirerBIN + TerminalID + Num_operacion +
 * Importe + TipoMoneda + Exponente + Cifrado + URL_OK + URL_NOK.
 * v8.27: no enviar Pago_soportado ni Pago_elegido.
 */

import { getCecaConfig } from './config';
import { generateSignature, generateSignatureHmac } from './signature';

export type BuildPaymentParamsInput = {
  amount: number;
  numOperacion: string;
  urlOk: string;
  urlNok: string;
  descripcion: Record<string, unknown>;
  /** Para diagnóstico: forzar SHA2 en lugar de HMAC */
  forceSha2?: boolean;
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

  const { amount, numOperacion, urlOk, urlNok, descripcion, forceSha2 } = input;
  if (amount < 0.01) return null;

  const numOp = numOperacion.replace(/\D/g, '').padStart(12, '0').slice(-12);
  if (!numOp) return null;

  const importeCents = Math.round(amount * 100);
  const importeVal = importeCents.toString();
  let cifrado: string = forceSha2 || !config.useHmac ? 'SHA2' : 'HMAC';

  const cadenaParams =
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
  const cadenaCompleta = config.secretKey + cadenaParams;

  let firma: string;
  if (config.useHmac && !forceSha2) {
    try {
      firma = generateSignatureHmac(config.secretKey, numOp, cadenaCompleta);
    } catch {
      cifrado = 'SHA2';
      const cadenaSha2 =
        config.secretKey +
        config.merchantId +
        config.acquirerBin +
        config.terminal +
        numOp +
        importeVal +
        '978' +
        '2' +
        'SHA2' +
        urlOk +
        urlNok;
      firma = generateSignature(cadenaSha2);
    }
  } else {
    firma = generateSignature(cadenaCompleta);
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
