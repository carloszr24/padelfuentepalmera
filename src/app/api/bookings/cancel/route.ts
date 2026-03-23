import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendClubNotification } from '@/lib/sendgrid';
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

  try {
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('booking_date, start_time, end_time, courts(name)')
      .eq('id', bookingId)
      .single();

    const dateFormatted = bookingData?.booking_date
      ? new Date(`${bookingData.booking_date}T00:00:00`).toLocaleDateString('es-ES')
      : '';

    const bookingStartMadrid = bookingData?.booking_date && bookingData?.start_time
      ? new Date(`${bookingData.booking_date}T${String(bookingData.start_time).slice(0, 5)}:00`)
      : null;

    const now = new Date();
    const diffMs = bookingStartMadrid ? bookingStartMadrid.getTime() - now.getTime() : 0;
    const antelacion = diffMs >= 24 * 60 * 60 * 1000 ? 'Más de 24h' : 'Menos de 24h';

    const courtName = Array.isArray(bookingData?.courts)
      ? bookingData?.courts?.[0]?.name
      : bookingData?.courts?.name;

    await sendClubNotification({
      subject: `❌ Cancelación — ${courtName ?? 'Pista'} ${dateFormatted} ${String(bookingData?.start_time ?? '').slice(0, 5)}`,
      html: `
      <h2>Reserva cancelada</h2>
      <p><strong>Socio:</strong> ${user.email ?? 'Sin email'}</p>
      <p><strong>Pista:</strong> ${courtName ?? 'Pista'}</p>
      <p><strong>Fecha:</strong> ${dateFormatted}</p>
      <p><strong>Hora:</strong> ${String(bookingData?.start_time ?? '').slice(0, 5)} - ${String(bookingData?.end_time ?? '').slice(0, 5)}</p>
      <p><strong>Antelación:</strong> ${antelacion}</p>
    `,
    });
  } catch (emailError) {
    console.error('SendGrid cancel notification error:', emailError);
  }

  return NextResponse.json({ ok: true });
}
