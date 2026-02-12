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
  if (!stripe || !webhookSecret) {
    console.error('STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET no configurados');
    return NextResponse.json(
      { error: 'Webhook no configurado' },
      { status: 500 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de la petición inválido' },
      { status: 400 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Falta firma' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Firma inválida';
    console.error('Stripe webhook signature error:', message);
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  let session = event.data.object as Stripe.Checkout.Session;

  // En algunos entornos la metadata no viene en el evento; recuperar la sesión completa.
  const needsMetadata =
    !session.metadata?.userId || session.metadata?.amount == null || session.metadata?.amount === '';
  if (needsMetadata && session.id) {
    try {
      const full = await stripe.checkout.sessions.retrieve(session.id);
      session = full;
    } catch (retrieveErr) {
      console.error('Webhook: error al recuperar sesión', session.id, retrieveErr);
    }
  }

  const userId =
    (session.metadata?.userId as string | undefined) ?? session.client_reference_id ?? null;
  const amountStr = session.metadata?.amount as string | undefined;
  const amountFromTotal =
    session.amount_total != null ? Number((session.amount_total / 100).toFixed(2)) : NaN;

  const amount = amountStr != null && amountStr !== '' ? Number(amountStr) : amountFromTotal;

  if (!userId) {
    console.error('Webhook: no userId (metadata.userId ni client_reference_id)', {
      sessionId: session.id,
      metadata: session.metadata,
      client_reference_id: session.client_reference_id,
    });
    return NextResponse.json(
      { error: 'No se pudo identificar al usuario (userId)' },
      { status: 400 }
    );
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    console.error('Webhook: amount inválido', { amountStr, amountFromTotal, amount });
    return NextResponse.json({ error: 'Amount inválido' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.rpc('wallet_recharge', {
      p_user_id: userId,
      p_amount: amount,
      p_description: 'Recarga monedero (Stripe)',
      p_stripe_session_id: session.id ?? null,
    });

    if (error) {
      console.error('wallet_recharge error:', error.message, error.details, { userId, amount });
      return NextResponse.json(
        { error: 'Error al acreditar el monedero', detail: error.message },
        { status: 500 }
      );
    }

    console.info('Webhook: wallet_recharge OK', { userId, amount, sessionId: session.id });
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Webhook exception:', e);
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    );
  }
}
