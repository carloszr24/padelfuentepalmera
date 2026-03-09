/**
 * Configuración TPV Cecabank (según manual).
 * Variables: CECA_* o legacy REDSYS_*.
 */

const CECABANK_URL_TEST = 'https://tpv.ceca.es/tpvweb/tpv/compra.action';
const CECABANK_URL_PROD = 'https://pgw.ceca.es/tpvweb/tpv/compra.action';

export function getCecaConfig(): {
  merchantId: string;
  acquirerBin: string;
  terminal: string;
  secretKey: string;
  formAction: string;
} {
  const merchantId =
    process.env.CECA_MERCHANT_ID ?? process.env.REDSYS_MERCHANT_CODE ?? '';
  const acquirerBin =
    process.env.CECA_ACQUIRER_BIN ?? process.env.REDSYS_ACQUIRER_BIN ?? '';
  const terminal =
    process.env.CECA_TERMINAL ?? process.env.REDSYS_TERMINAL ?? '';
  const secretKey =
    process.env.CECA_SECRET_KEY ?? process.env.REDSYS_SECRET_KEY ?? '';
  const envRaw = process.env.CECA_ENV ?? '';
  const configuredUrl = (process.env.CECA_URL ?? process.env.REDSYS_URL ?? '').trim();
  const isProd =
    envRaw === 'production' ||
    (!envRaw && configuredUrl.includes('pgw.ceca.es'));

  const formAction =
    configuredUrl ||
    (isProd ? CECABANK_URL_PROD : CECABANK_URL_TEST);

  const terminal8 = terminal.replace(/\D/g, '').padStart(8, '0').slice(-8);

  return {
    merchantId,
    acquirerBin,
    terminal: terminal8,
    secretKey,
    formAction,
  };
}

export function isCecaConfigured(): boolean {
  const c = getCecaConfig();
  return !!(c.merchantId && c.acquirerBin && c.terminal && c.secretKey);
}
