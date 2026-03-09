/**
 * POST /api/ceca/create-payment
 * Genera parámetros del formulario de pago según manual Cecabank.
 * Body: { amount: number, origin?: string }
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { buildPaymentParams, isCecaConfigured } from '@/lib/cecabank';

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

function isAllowedOrigin(origin: string, request: Request): boolean {
  try {
    const o = new URL(origin);
    if (o.protocol !== 'https:' && o.protocol !== 'http:') return false;
    const serverHost = new URL(getBaseUrl(request)).hostname;
    if (o.hostname === serverHost) return true;
    if (o.hostname.endsWith('.vercel.app')) return true;
    if (o.hostname === new URL(FALLBACK_BASE_URL).hostname) return true;
  } catch {
    return false;
  }
  return false;
}

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => ({}));
  const amount = body.amount as number | undefined;
  const clientOrigin = typeof body.origin === 'string' ? body.origin.trim() : undefined;
  if (amount == null || amount < 1) {
    return NextResponse.json({ error: 'Cantidad mínima 1€' }, { status: 400 });
  }

  const baseUrl =
    clientOrigin && isAllowedOrigin(clientOrigin, request)
      ? clientOrigin.replace(/\/$/, '')
      : getBaseUrl(request);

  const numOperacion = Date.now().toString().replace(/\D/g, '').padStart(12, '0').slice(-12);
  const urlOk = `${baseUrl}/panel/monedero/exito?order=${numOperacion}&amount=${amount}&user_id=${user.id}`;
  const urlNok = `${baseUrl}/panel/monedero?error=1`;

  const result = buildPaymentParams({
    amount,
    numOperacion,
    urlOk,
    urlNok,
    descripcion: { user_id: user.id, amount },
  });

  if (!result) {
    return NextResponse.json({ error: 'Error al generar parámetros de pago' }, { status: 500 });
  }

  try {
    const serviceSupabase = createSupabaseServiceClient();
    await serviceSupabase.from('wallet_operations_pending').insert({
      num_operacion: numOperacion,
      user_id: user.id,
      amount_euros: amount,
      status: 'pending',
    });
  } catch (err) {
    console.warn('[Ceca create-payment] wallet_operations_pending:', err);
  }

  // #region agent log
  const logPayload = {
    sessionId: '68ad37',
    location: 'create-payment/route.ts:103',
    message: 'create-payment result',
    data: {
      formAction: result.formAction,
      fieldKeys: Object.keys(result.formFields),
      MerchantID: result.formFields.MerchantID,
      AcquirerBIN: result.formFields.AcquirerBIN,
      TerminalID: result.formFields.TerminalID,
      Num_operacion: result.formFields.Num_operacion,
      Importe: result.formFields.Importe,
      TipoMoneda: result.formFields.TipoMoneda,
      Exponente: result.formFields.Exponente,
      Cifrado: result.formFields.Cifrado,
      firmaDefined: !!result.formFields.Firma,
      firmaLength: result.formFields.Firma?.length ?? 0,
      urlOk: result.formFields.URL_OK,
      urlNok: result.formFields.URL_NOK,
    },
    timestamp: Date.now(),
    hypothesisId: 'A,B,C,D,E',
  };
  fetch('http://127.0.0.1:7543/ingest/b946c3ce-2e52-4378-b9f6-afbd4bfaf00a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '68ad37' },
    body: JSON.stringify(logPayload),
  }).catch(() => {});
  // #endregion

  return NextResponse.json({
    formAction: result.formAction,
    formFields: result.formFields,
  });
}
