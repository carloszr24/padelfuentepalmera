import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Plan B: al volver de Stripe con success, el front llama aquí con el session_id.
 * Acreditamos el saldo aquí si el webhook no lo ha hecho (idempotente por session_id).
 */
export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let sessionId: string;
  try {
    const body = await request.json();
    sessionId = (body?.session_id ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'session_id requerido' }, { status: 400 });
  }

  if (!sessionId || !sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'session_id inválido' }, { status: 400 });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e) {
    console.error('[confirm-session] Stripe retrieve error', e);
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 400 });
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'El pago no está completado' }, { status: 400 });
  }

  const sessionUserId =
    (session.metadata?.userId as string) ?? session.client_reference_id ?? null;
  if (sessionUserId !== user.id) {
    return NextResponse.json({ error: 'La sesión no corresponde a este usuario' }, { status: 403 });
  }

  const amountStr = session.metadata?.amount as string | undefined;
  const amountFromTotal =
    session.amount_total != null ? Number((session.amount_total / 100).toFixed(2)) : NaN;
  const amount = amountStr != null && amountStr !== '' ? Number(amountStr) : amountFromTotal;

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Importe no válido' }, { status: 400 });
  }

  try {
    const serviceSupabase = createSupabaseServiceClient();
    const { error } = await serviceSupabase.rpc('wallet_recharge', {
      p_user_id: user.id,
      p_amount: amount,
      p_description: 'Recarga monedero (Stripe)',
      p_stripe_session_id: session.id,
    });

    if (error) {
      if (error.message?.includes('Amount must be positive') === false) {
        console.error('[confirm-session] wallet_recharge error', error.message);
      }
      return NextResponse.json(
        { error: error.message ?? 'Error al acreditar' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, credited: true });
  } catch (e) {
    console.error('[confirm-session] exception', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
