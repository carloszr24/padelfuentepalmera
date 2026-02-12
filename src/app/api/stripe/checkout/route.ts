import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const MIN_AMOUNT_EUR = 10;
const MAX_AMOUNT_EUR = 500;

export async function POST(request: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Pasarela de pago no configurada' },
        { status: 503 }
      );
    }
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const amountEur = Number(body?.amount);
    if (
      !Number.isFinite(amountEur) ||
      amountEur < MIN_AMOUNT_EUR ||
      amountEur > MAX_AMOUNT_EUR
    ) {
      return NextResponse.json(
        { error: `Cantidad entre ${MIN_AMOUNT_EUR} y ${MAX_AMOUNT_EUR} €` },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_URL?.replace(/\/$/, '') || 'http://localhost:3000';

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
      success_url: `${baseUrl}/panel/monedero?success=1`,
      cancel_url: `${baseUrl}/panel/monedero?cancel=1`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'No se pudo crear la sesión de pago' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout error:', e);
    return NextResponse.json(
      { error: 'Error al crear el pago' },
      { status: 500 }
    );
  }
}
