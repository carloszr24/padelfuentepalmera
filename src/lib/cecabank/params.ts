/**
 * Parámetros del formulario de pago (checkout) – según manual oficial Cecabank/Unicaja.
 * Cadena: Clave + MerchantID + AcquirerBIN + TerminalID + Num_operacion +
 * Importe + TipoMoneda + Exponente + "SHA2" + URL_OK + URL_NOK.
 * Firma = SHA-256(cadena) en hexadecimal minúsculas (sección 5, "Cálculo de la firma").
 */

import { getCecaConfig } from './config';
import { generateSignature } from './signature';

export type BuildPaymentParamsInput = {
  amount: number;
  numOperacion: string;
  urlOk: string;
  urlNok: string;
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

  const { amount, numOperacion, urlOk, urlNok } = input;
  if (amount < 0.01) return null;

  const numOp = numOperacion.replace(/\D/g, '').padStart(12, '0').slice(-12);
  if (!numOp) return null;

  const importeCents = Math.round(amount * 100);
  const importeVal = importeCents.toString();

  const cifrado = 'SHA2';

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

  const firma = generateSignature(cadenaCompleta);

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
