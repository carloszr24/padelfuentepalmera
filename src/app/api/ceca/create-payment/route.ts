/**
 * POST /api/ceca/create-payment
 * Genera parámetros del formulario de pago según manual Cecabank.
 * Body: { amount: number, origin?: string }
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { buildPaymentParams, isCecaConfigured } from '@/lib/cecabank';
import { checkRateLimit } from '@/lib/rate-limit';

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 500;

const ALLOWED_HOSTS = new Set([
  'www.padelfuentepalmera.com',
  'padelfuentepalmera.com',
  ...(process.env.NEXT_PUBLIC_SITE_URL
    ? [new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname]
    : []),
].filter(Boolean));

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

function isAllowedOrigin(origin: string): boolean {
  try {
    const o = new URL(origin);
    if (o.protocol !== 'https:' && o.protocol !== 'http:') return false;
    return ALLOWED_HOSTS.has(o.hostname);
  } catch {
    return false;
  }
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

  const body = await request.json().catch(() => ({}));
  const amount = body.amount as number | undefined;
  const clientOrigin = typeof body.origin === 'string' ? body.origin.trim() : undefined;

  if (amount == null || amount < MIN_AMOUNT) {
    return NextResponse.json({ error: `Cantidad mínima ${MIN_AMOUNT}€` }, { status: 400 });
  }
  if (amount > MAX_AMOUNT) {
    return NextResponse.json({ error: `Cantidad máxima ${MAX_AMOUNT}€` }, { status: 400 });
  }

  const baseUrl =
    clientOrigin && isAllowedOrigin(clientOrigin)
      ? clientOrigin.replace(/\/$/, '')
      : getBaseUrl(request);

  const numOperacion = Date.now().toString().replace(/\D/g, '').padStart(12, '0').slice(-12);
  const urlOk = `${baseUrl}/panel/monedero/exito?order=${numOperacion}&amount=${amount}`;
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

  return NextResponse.json({
    formAction: result.formAction,
    formFields: result.formFields,
  });
}
