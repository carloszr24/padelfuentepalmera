import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { checkRateLimit } from '@/lib/rate-limit';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit('webhook', ip)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    console.error('[Webhook] STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET no configurados');
    return NextResponse.json(
      { error: 'Webhook no configurado' },
      { status: 500 }
    );
  }

  const isDev = process.env.NODE_ENV === 'development';

  let rawBody: string;
  try {
    rawBody = await request.text();
    if (isDev) console.log('[Webhook] Body leído, longitud:', rawBody?.length ?? 0);
  } catch (e) {
    console.error('[Webhook] Error leyendo body:', e);
    return NextResponse.json(
      { error: 'Cuerpo de la petición inválido' },
      { status: 400 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    if (isDev) console.error('[Webhook] Falta cabecera stripe-signature');
    return NextResponse.json({ error: 'Falta firma' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    if (isDev) console.log('[Webhook] Evento verificado, type:', event.type);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Firma inválida';
    console.error('[Webhook] Firma inválida:', message);
    return NextResponse.json(
      { error: 'Firma inválida' },
      { status: 400 }
    );
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  let session = event.data.object as Stripe.Checkout.Session;

  const needsMetadata =
    !session.metadata?.userId || session.metadata?.amount == null || session.metadata?.amount === '';
  if (needsMetadata && session.id) {
    try {
      const full = await stripe.checkout.sessions.retrieve(session.id);
      session = full;
    } catch (retrieveErr) {
      console.error('[Webhook] Error al recuperar sesión:', retrieveErr);
    }
  }

  const userId =
    (session.metadata?.userId as string | undefined) ?? session.client_reference_id ?? null;
  const amountStr = session.metadata?.amount as string | undefined;
  const amountFromTotal =
    session.amount_total != null ? Number((session.amount_total / 100).toFixed(2)) : NaN;
  const amount = amountStr != null && amountStr !== '' ? Number(amountStr) : amountFromTotal;

  if (!userId) {
    if (isDev) console.error('[Webhook] No userId');
    return NextResponse.json(
      { error: 'No se pudo identificar al usuario (userId)' },
      { status: 400 }
    );
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    if (isDev) console.error('[Webhook] Amount inválido');
    return NextResponse.json({ error: 'Amount inválido' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch (e) {
    console.error('[Webhook] Error creando cliente Supabase:', e);
    return NextResponse.json(
      { error: 'Error configurando Supabase' },
      { status: 500 }
    );
  }

  const rpcParams = {
    p_user_id: userId,
    p_amount: amount,
    p_description: 'Recarga monedero (Stripe)',
    p_stripe_session_id: session.id ?? null,
  };

  try {
    const { error } = await supabase.rpc('wallet_recharge', rpcParams);

    if (error) {
      console.error('[Webhook] Supabase RPC error:', error.message);
      return NextResponse.json(
        { error: 'Error al acreditar el monedero', detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true, credited: true });
  } catch (e) {
    console.error('[Webhook] Excepción al llamar RPC:', e);
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    );
  }
}
