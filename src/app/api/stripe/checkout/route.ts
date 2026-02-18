import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const MIN_AMOUNT_EUR = 10;
const MAX_AMOUNT_EUR = 500;

const baseUrl =
  process.env.NEXT_PUBLIC_URL?.replace(/\/$/, '') || 'http://localhost:3000';

const ALLOWED_ORIGINS = [
  new URL(baseUrl).origin,
  'https://padelfuentepalmera.com',
  'https://www.padelfuentepalmera.com',
  'http://localhost:3000',
].filter((o, i, a) => a.indexOf(o) === i);

function isAllowedOrigin(origin: string | null, referer: string | null): boolean {
  if (!origin && !referer) return true;
  const check = (urlStr: string) => {
    try {
      return ALLOWED_ORIGINS.includes(new URL(urlStr).origin);
    } catch {
      return false;
    }
  };
  if (origin && check(origin)) return true;
  if (referer && check(referer)) return true;
  return false;
}

export async function POST(request: Request) {
  console.time('checkout-session');
  const totalStart = performance.now();

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit('checkout', ip)) {
    console.timeEnd('checkout-session');
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    console.timeEnd('checkout-session');
    return NextResponse.json(
      { error: 'Content-Type debe ser application/json' },
      { status: 415 }
    );
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  if (!isAllowedOrigin(origin, referer)) {
    console.timeEnd('checkout-session');
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
  }

  try {
    if (!stripe) {
      console.timeEnd('checkout-session');
      return NextResponse.json(
        { error: 'Pasarela de pago no configurada' },
        { status: 503 }
      );
    }

    const authStart = performance.now();
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log(`[checkout] auth: ${(performance.now() - authStart).toFixed(0)}ms`);

    if (!user) {
      console.timeEnd('checkout-session');
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    let body: { amount?: unknown };
    try {
      body = await request.json();
    } catch {
      console.timeEnd('checkout-session');
      return NextResponse.json(
        { error: 'Cuerpo JSON inválido' },
        { status: 400 }
      );
    }
    const amountEur = Number(body?.amount);
    if (
      !Number.isFinite(amountEur) ||
      amountEur < MIN_AMOUNT_EUR ||
      amountEur > MAX_AMOUNT_EUR
    ) {
      console.timeEnd('checkout-session');
      return NextResponse.json(
        { error: `Cantidad entre ${MIN_AMOUNT_EUR} y ${MAX_AMOUNT_EUR} €` },
        { status: 400 }
      );
    }

    const stripeStart = performance.now();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(amountEur * 100),
            product_data: {
              name: 'Recarga monedero',
              description: `Recarga de ${amountEur.toFixed(2)} € para el club Fuente Palmera Padel`,
            },
          },
        },
      ],
      metadata: {
        userId: user.id,
        amount: String(amountEur),
      },
      success_url: `${baseUrl}/panel/monedero/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/panel/monedero?cancel=1`,
    });
    console.log(`[checkout] stripe.create: ${(performance.now() - stripeStart).toFixed(0)}ms`);

    if (!session.url) {
      console.timeEnd('checkout-session');
      return NextResponse.json(
        { error: 'No se pudo crear la sesión de pago' },
        { status: 500 }
      );
    }

    console.log(`[checkout] total: ${(performance.now() - totalStart).toFixed(0)}ms`);
    console.timeEnd('checkout-session');
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout error:', e);
    console.timeEnd('checkout-session');
    return NextResponse.json(
      { error: 'Error al crear el pago' },
      { status: 500 }
    );
  }
}
