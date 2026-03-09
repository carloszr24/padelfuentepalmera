/**
 * Comunicación on-line (webhook) Cecabank – según manual 3.3.
 * Firma siempre SHA2; cadena: Clave + MerchantID + AcquirerBIN + TerminalID +
 * Num_operacion + Importe (12 dígitos) + TipoMoneda + Exponente + Referencia.
 */

import { getCecaConfig } from './config';
import { validateSignature } from './signature';

export type CallbackFormData = {
  MerchantID: string;
  AcquirerBIN: string;
  TerminalID: string;
  Num_operacion: string;
  Importe: string;
  TipoMoneda: string;
  Exponente: string;
  Referencia: string;
  Num_aut: string;
  Firma: string;
  Descripcion: string;
};

export function parseCallbackFormData(
  get: (name: string) => string | null
): CallbackFormData {
  const g = (n: string) => (get(n) as string) ?? '';
  return {
    MerchantID: g('MerchantID'),
    AcquirerBIN: g('AcquirerBIN'),
    TerminalID: g('TerminalID'),
    Num_operacion: g('Num_operacion'),
    Importe: g('Importe'),
    TipoMoneda: g('TipoMoneda'),
    Exponente: g('Exponente'),
    Referencia: g('Referencia'),
    Num_aut: g('Num_aut'),
    Firma: g('Firma'),
    Descripcion: g('Descripcion'),
  };
}

/**
 * Valida la firma del callback.
 * Manual: el Importe en el webhook tiene longitud fija 12 dígitos (ceros a la izquierda).
 */
export function validateCallbackSignature(data: CallbackFormData): boolean {
  const config = getCecaConfig();
  if (!config.secretKey) return false;

  const importe12 = (data.Importe || '0')
    .replace(/\D/g, '')
    .padStart(12, '0')
    .slice(-12);
  const cadena =
    config.secretKey +
    data.MerchantID +
    data.AcquirerBIN +
    data.TerminalID +
    data.Num_operacion +
    importe12 +
    data.TipoMoneda +
    data.Exponente +
    data.Referencia;

  return validateSignature(cadena, data.Firma);
}
