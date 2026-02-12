import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/** GET: comprobar que la ruta del webhook responde (no que Stripe esté enviando aquí). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Webhook endpoint. Stripe debe enviar POST con stripe-signature.',
  });
}

export async function POST(request: Request) {
  console.log('[Webhook] POST recibido');

  if (!stripe || !webhookSecret) {
    console.error('[Webhook] STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET no configurados');
    return NextResponse.json(
      { error: 'Webhook no configurado' },
      { status: 500 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
    console.log('[Webhook] Body leído, longitud:', rawBody?.length ?? 0);
  } catch (e) {
    console.error('[Webhook] Error leyendo body:', e);
    return NextResponse.json(
      { error: 'Cuerpo de la petición inválido' },
      { status: 400 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    console.error('[Webhook] Falta cabecera stripe-signature');
    return NextResponse.json({ error: 'Falta firma' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log('[Webhook] Evento verificado, type:', event.type, 'id:', event.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Firma inválida';
    console.error('[Webhook] Firma inválida:', message);
    return NextResponse.json(
      { error: 'Firma inválida' },
      { status: 400 }
    );
  }

  if (event.type !== 'checkout.session.completed') {
    console.log('[Webhook] Evento ignorado (no checkout.session.completed)');
    return NextResponse.json({ received: true });
  }

  let session = event.data.object as Stripe.Checkout.Session;

  // LOG: metadata ANTES de cualquier lógica (para ver qué llega del evento)
  console.log('[Webhook] session.metadata (del evento):', JSON.stringify(session.metadata));
  console.log('[Webhook] session.client_reference_id:', session.client_reference_id);
  console.log('[Webhook] session.amount_total (cents):', session.amount_total);
  console.log('[Webhook] session.id:', session.id);

  // En algunos entornos la metadata no viene en el evento; recuperar la sesión completa.
  const needsMetadata =
    !session.metadata?.userId || session.metadata?.amount == null || session.metadata?.amount === '';
  if (needsMetadata && session.id) {
    console.log('[Webhook] Metadata incompleta, recuperando sesión completa con Stripe API');
    try {
      const full = await stripe.checkout.sessions.retrieve(session.id);
      session = full;
      console.log('[Webhook] session.metadata (tras retrieve):', JSON.stringify(session.metadata));
      console.log('[Webhook] session.client_reference_id (tras retrieve):', session.client_reference_id);
    } catch (retrieveErr) {
      console.error('[Webhook] Error al recuperar sesión:', session.id, retrieveErr);
    }
  }

  const userId =
    (session.metadata?.userId as string | undefined) ?? session.client_reference_id ?? null;
  const amountStr = session.metadata?.amount as string | undefined;
  const amountFromTotal =
    session.amount_total != null ? Number((session.amount_total / 100).toFixed(2)) : NaN;
  const amount = amountStr != null && amountStr !== '' ? Number(amountStr) : amountFromTotal;

  console.log('[Webhook] Extraídos -> userId:', userId, 'amountStr:', amountStr, 'amountFromTotal:', amountFromTotal, 'amount final:', amount);

  if (!userId) {
    console.error('[Webhook] No userId. metadata:', session.metadata, 'client_reference_id:', session.client_reference_id);
    return NextResponse.json(
      { error: 'No se pudo identificar al usuario (userId)' },
      { status: 400 }
    );
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    console.error('[Webhook] Amount inválido:', { amountStr, amountFromTotal, amount });
    return NextResponse.json({ error: 'Amount inválido' }, { status: 400 });
  }

  // Cliente Supabase con SERVICE_ROLE_KEY (bypasea RLS; necesario para que la RPC actualice profiles)
  let supabase;
  try {
    supabase = createSupabaseServiceClient();
    console.log('[Webhook] Cliente Supabase creado (SUPABASE_SERVICE_ROLE_KEY)');
  } catch (e) {
    console.error('[Webhook] Error creando cliente Supabase (¿SUPABASE_SERVICE_ROLE_KEY en env?):', e);
    return NextResponse.json(
      { error: 'Error configurando Supabase' },
      { status: 500 }
    );
  }

  // RPC: wallet_recharge(p_user_id UUID, p_amount NUMERIC, p_description TEXT, p_stripe_session_id TEXT)
  // La función hace UPDATE profiles SET wallet_balance = ... WHERE id = p_user_id (campo id, no user_id)
  const rpcParams = {
    p_user_id: userId,
    p_amount: amount,
    p_description: 'Recarga monedero (Stripe)',
    p_stripe_session_id: session.id ?? null,
  };
  console.log('[Webhook] Llamando supabase.rpc("wallet_recharge", ...) con params:', JSON.stringify(rpcParams));

  try {
    const { data, error } = await supabase.rpc('wallet_recharge', rpcParams);

    if (error) {
      console.error('[Webhook] Supabase RPC error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        params: rpcParams,
      });
      return NextResponse.json(
        { error: 'Error al acreditar el monedero', detail: error.message },
        { status: 500 }
      );
    }

    console.log('[Webhook] wallet_recharge OK. data:', data, 'userId:', userId, 'amount:', amount, 'sessionId:', session.id);
    return NextResponse.json({ received: true, credited: true });
  } catch (e) {
    console.error('[Webhook] Excepción al llamar RPC o tras RPC:', e);
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    );
  }
}
