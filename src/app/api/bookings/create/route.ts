import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { message: 'No autenticado' },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { courtId, bookingDate, startTime, endTime } = body as {
    courtId?: string;
    bookingDate?: string;
    startTime?: string;
    endTime?: string;
  };

  if (!courtId || !bookingDate || !startTime || !endTime) {
    return NextResponse.json(
      { message: 'Faltan datos: pista, fecha, hora inicio y hora fin' },
      { status: 400 }
    );
  }

  const startNorm = String(startTime).slice(0, 5);
  const now = new Date();
  const todayMadrid = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  const timeMadrid = now.toLocaleTimeString('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  if (bookingDate < todayMadrid || (bookingDate === todayMadrid && startNorm <= timeMadrid)) {
    return NextResponse.json(
      { message: 'No se puede reservar una hora que ya ha pasado' },
      { status: 400 }
    );
  }

  const { error } = await supabase.rpc('booking_pay_deposit', {
    p_user_id: user.id,
    p_court_id: courtId,
    p_booking_date: bookingDate,
    p_start_time: startTime,
    p_end_time: endTime,
  });

  if (error) {
    const msg = (error.message ?? '').toLowerCase();
    if (
      msg.includes('insufficient') ||
      msg.includes('saldo') ||
      msg.includes('balance')
    ) {
      return NextResponse.json(
        { code: 'INSUFFICIENT_BALANCE', message: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: error.message ?? 'Error al crear la reserva' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
