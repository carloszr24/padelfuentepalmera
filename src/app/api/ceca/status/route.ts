/**
 * GET /api/ceca/status
 * Comprueba que las variables Ceca estén cargadas (sin mostrar valores secretos).
 */

import { NextResponse } from 'next/server';
import { getCecaConfig, isCecaConfigured } from '@/lib/cecabank';

export async function GET() {
  const configured = isCecaConfigured();
  const config = getCecaConfig();
  return NextResponse.json({
    configured,
    formAction: config.formAction,
    useHmac: config.useHmac,
    env: {
      hasMerchantId: !!config.merchantId,
      hasAcquirerBin: !!config.acquirerBin,
      hasTerminal: !!config.terminal,
      hasSecretKey: !!config.secretKey,
    },
  });
}
