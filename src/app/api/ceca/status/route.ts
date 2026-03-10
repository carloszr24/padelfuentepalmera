/**
 * GET /api/ceca/status
 * Comprueba que las variables Ceca estén cargadas. Solo para admins.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCecaConfig, isCecaConfigured } from '@/lib/cecabank';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  }

  const configured = isCecaConfigured();
  const config = getCecaConfig();
  return NextResponse.json({
    configured,
    cifrado: 'HMAC',
    env: process.env.CECA_ENV ?? 'not set',
    env_vars: {
      hasMerchantId: !!config.merchantId,
      hasAcquirerBin: !!config.acquirerBin,
      hasTerminal: !!config.terminal,
      hasSecretKey: !!config.secretKey,
    },
  });
}
