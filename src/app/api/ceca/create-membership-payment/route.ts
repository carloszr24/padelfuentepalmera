/**
 * POST /api/ceca/create-membership-payment
 * Genera parámetros de pago Cecabank para la cuota de socio (15 €, cuota anual fija).
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { buildPaymentParams, isCecaConfigured } from '@/lib/cecabank';
import { checkRateLimit } from '@/lib/rate-limit';

const MEMBERSHIP_FEE_EUR = 15;

const FALLBACK_BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_URL ||
  'https://www.padelfuentepalmera.com'
).replace(/\/$/, '');

function getBaseUrl(request: Request): string {
  const host = request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto');
  if (host) {
    return `${proto === 'https' ? 'https' : 'http'}://${host}`.replace(/\/$/, '');
  }
  try {
    const u = new URL(request.url);
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return u.origin;
  } catch {
    // ignore
  }
  return FALLBACK_BASE_URL;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  if (!checkRateLimit('checkout', ip)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  if (!isCecaConfigured()) {
    return NextResponse.json(
      { error: 'TPV no configurado (faltan CECA_* en variables de entorno)' },
      { status: 503 }
    );
  }

  const baseUrl = getBaseUrl(request);
  const numOperacion = Date.now().toString().replace(/\D/g, '').padStart(12, '0').slice(-12);
  const urlOk = `${baseUrl}/panel/membresia/exito?order=${numOperacion}`;
  const urlNok = `${baseUrl}/panel/membresia?error=1`;

  const result = buildPaymentParams({
    amount: MEMBERSHIP_FEE_EUR,
    numOperacion,
    urlOk,
    urlNok,
  });

  if (!result) {
    return NextResponse.json({ error: 'Error al generar parámetros de pago' }, { status: 500 });
  }

  try {
    const serviceSupabase = createSupabaseServiceClient();
    await serviceSupabase.from('membership_payments_pending').insert({
      num_operacion: numOperacion,
      user_id: user.id,
      amount_euros: MEMBERSHIP_FEE_EUR,
      status: 'pending',
    });
  } catch (err) {
    console.warn('[Ceca create-membership-payment] membership_payments_pending insert:', err);
  }

  return NextResponse.json({
    formAction: result.formAction,
    formFields: result.formFields,
  });
}
