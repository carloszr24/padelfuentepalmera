import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isValidUUID } from '@/lib/utils';

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  if (!checkRateLimit('booking', ip)) {
    return NextResponse.json(
      { message: 'Demasiadas peticiones. Espera un momento.' },
      { status: 429 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const bookingId = typeof body?.bookingId === 'string' ? body.bookingId.trim() : null;

  if (!bookingId) {
    return NextResponse.json(
      { message: 'Falta el identificador de la reserva' },
      { status: 400 }
    );
  }
  if (!isValidUUID(bookingId)) {
    return NextResponse.json(
      { message: 'Identificador de reserva no válido' },
      { status: 400 }
    );
  }

  const { error } = await supabase.rpc('user_cancel_booking', {
    p_booking_id: bookingId,
  });

  if (error) {
    const message =
      error.message?.includes('permission') || error.message?.includes('function')
        ? 'Error de configuración: ejecuta el SQL de cancelación en Supabase (cancel-booking-policy.sql) y el GRANT para authenticated.'
        : (error.message ?? 'Error al cancelar la reserva');
    return NextResponse.json(
      { message },
      { status: error.message?.includes('permission') ? 403 : 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
