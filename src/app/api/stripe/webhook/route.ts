import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.userId;
  const amountStr = session.metadata?.amount;

  if (!userId || !amountStr) {
    console.error('Webhook: metadata sin userId o amount', session.metadata);
    return NextResponse.json(
      { error: 'Metadata incompleta' },
      { status: 400 }
    );
  }

  const amount = Number(amountStr);
  if (!Number.isFinite(amount) || amount <= 0) {
    console.error('Webhook: amount inválido', amountStr);
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
      console.error('wallet_recharge error:', error);
      return NextResponse.json(
        { error: 'Error al acreditar el monedero' },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Webhook exception:', e);
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    );
  }
}
