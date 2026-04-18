import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { sendClubNotification } from '@/lib/sendgrid';
import { getOpeningForDate } from '@/lib/club-schedule';
import { isSameDayMadridTooSoon, minutesFromClock } from '@/lib/booking-lead-time';
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
    return NextResponse.json(
      { message: 'No autenticado' },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { courtId, bookingDate, startTime, endTime, metodo_pago } = body as {
    courtId?: string;
    bookingDate?: string;
    startTime?: string;
    endTime?: string;
    metodo_pago?: 'bono' | 'monedero';
  };

  if (!courtId || !bookingDate || !startTime || !endTime) {
    return NextResponse.json(
      { message: 'Faltan datos: pista, fecha, hora inicio y hora fin' },
      { status: 400 }
    );
  }
  if (!isValidUUID(courtId)) {
    return NextResponse.json(
      { message: 'Pista no válida' },
      { status: 400 }
    );
  }

  // Todas las consultas independientes en paralelo: perfil, membresía y horario del club
  const serviceSupabase = createSupabaseServiceClient();
  const [profileRes, membershipRes, opening] = await Promise.all([
    supabase.from('profiles').select('has_debt, wallet_balance, full_name, role').eq('id', user.id).single(),
    serviceSupabase.from('members').select('expiry_date, is_paid').eq('user_id', user.id).maybeSingle(),
    getOpeningForDate(bookingDate),
  ]);

  const profile = (profileRes.data as {
    has_debt?: boolean;
    wallet_balance?: number;
    full_name?: string | null;
    role?: string | null;
  } | null);
  const fullNameNorm = (profile?.full_name ?? '').trim().toLowerCase();
  const isAdmin =
    profile?.role === 'admin' ||
    fullNameNorm === 'administrador fuente palmera';
  const hasDebt = (profileRes.data as { has_debt?: boolean } | null)?.has_debt === true;
  const balance = Number((profileRes.data as { wallet_balance?: number } | null)?.wallet_balance ?? 0);
  if (!isAdmin && (hasDebt || balance < 0)) {
    return NextResponse.json(
      { message: 'Tienes una deuda pendiente o saldo insuficiente. Recarga tu monedero para poder reservar.' },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const membership = membershipRes.data;
  const isActiveMember =
    membership?.is_paid === true &&
    membership?.expiry_date != null &&
    membership.expiry_date >= today;

  const metodoPago: 'bono' | 'monedero' = metodo_pago === 'bono' ? 'bono' : 'monedero';
  const deposit = isActiveMember ? 4.5 : 5.0;

  const startNorm = String(startTime).slice(0, 5);
  const endNorm = String(endTime).slice(0, 5);
  const now = new Date();
  const todayMadrid = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  const timeMadrid = now.toLocaleTimeString('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  if (bookingDate < todayMadrid) {
    return NextResponse.json(
      { message: 'No se puede reservar en una fecha pasada' },
      { status: 400 }
    );
  }
  if (bookingDate === todayMadrid && isSameDayMadridTooSoon(bookingDate, todayMadrid, startNorm, timeMadrid)) {
    const slotAlreadyStarted = minutesFromClock(startNorm) < minutesFromClock(timeMadrid);
    return NextResponse.json(
      {
        message: slotAlreadyStarted
          ? 'No se puede reservar una hora que ya ha pasado'
          : 'Debes reservar con al menos 25 minutos de antelación respecto al inicio de la franja.',
      },
      { status: 400 }
    );
  }
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + 14);
  const maxDateMadrid = maxDate.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  if (bookingDate > maxDateMadrid) {
    return NextResponse.json(
      { message: 'Solo se pueden hacer reservas como máximo a 14 días vista' },
      { status: 400 }
    );
  }

  if (!opening.isOpen || opening.ranges.length === 0) {
    return NextResponse.json(
      { message: 'Club cerrado ese día.' },
      { status: 400 }
    );
  }
  const fitsInSomeRange = opening.ranges.some(
    (r) => startNorm >= r.openTime && endNorm <= r.closeTime
  );
  if (!fitsInSomeRange) {
    return NextResponse.json(
      { message: 'La franja horaria no está dentro del horario de apertura.' },
      { status: 400 }
    );
  }

  if (metodoPago === 'bono') {
    if (!isActiveMember) {
      return NextResponse.json(
        { message: 'El bono de socio solo está disponible para socios activos.' },
        { status: 403 }
      );
    }

    // Consumir bono de forma atómica (la función SQL hace FOR UPDATE internamente)
    const bonoResult = await serviceSupabase.rpc('usar_bono', { p_user_id: user.id });
    if (bonoResult.error) {
      return NextResponse.json(
        { message: bonoResult.error.message ?? 'Error al usar el bono.' },
        { status: 400 }
      );
    }
    if (bonoResult.data !== true) {
      return NextResponse.json(
        { message: 'Bono no disponible, elige otro método de pago' },
        { status: 409 }
      );
    }

    const insertResult = await serviceSupabase
      .from('bookings')
      .insert({
        user_id: user.id,
        court_id: courtId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
        deposit_paid: true,
        pagado_con_bono: true,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (insertResult.error) {
      const msg = insertResult.error.message ?? 'Error al crear la reserva con bono.';
      return NextResponse.json({ message: msg }, { status: 400 });
    }

    // Email en background: no bloquea la respuesta al usuario
    serviceSupabase.from('courts').select('name').eq('id', courtId).single().then(({ data: courtData }) => {
      const dateFormatted = new Date(`${bookingDate}T00:00:00`).toLocaleDateString('es-ES');
      sendClubNotification({
        subject: `🎾 Nueva reserva — ${courtData?.name ?? 'Pista'} ${dateFormatted} ${String(startTime).slice(0, 5)}`,
        html: `
      <h2>Nueva reserva</h2>
      <p><strong>Socio:</strong> ${profile?.full_name ?? user.email ?? 'Sin nombre'}</p>
      <p><strong>Pista:</strong> ${courtData?.name ?? 'Pista'}</p>
      <p><strong>Fecha:</strong> ${dateFormatted}</p>
      <p><strong>Hora:</strong> ${String(startTime).slice(0, 5)} - ${String(endTime).slice(0, 5)}</p>
      <p><strong>Pago:</strong> Bono de socio</p>
    `,
      }).catch((e) => console.error('SendGrid booking notification error (bono):', e));
    }).catch((e) => console.error('SendGrid court fetch error (bono):', e));

    return NextResponse.json({ ok: true, metodo_pago: 'bono' });
  }

  let rpcResult = await supabase.rpc('booking_pay_deposit', {
    p_user_id: user.id,
    p_court_id: courtId,
    p_booking_date: bookingDate,
    p_start_time: startTime,
    p_end_time: endTime,
    p_deposit: deposit,
  });

  // Si la función aún no tiene el parámetro p_deposit (migración pendiente), reintentar sin él
  if (
    rpcResult.error &&
    (rpcResult.error.message ?? '').toLowerCase().includes('could not find the function')
  ) {
    rpcResult = await supabase.rpc('booking_pay_deposit', {
      p_user_id: user.id,
      p_court_id: courtId,
      p_booking_date: bookingDate,
      p_start_time: startTime,
      p_end_time: endTime,
    });
  }

  const { error } = rpcResult;

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

  // Email en background: no bloquea la respuesta al usuario
  serviceSupabase.from('courts').select('name').eq('id', courtId).single().then(({ data: courtData }) => {
    const dateFormatted = new Date(`${bookingDate}T00:00:00`).toLocaleDateString('es-ES');
    sendClubNotification({
      subject: `🎾 Nueva reserva — ${courtData?.name ?? 'Pista'} ${dateFormatted} ${String(startTime).slice(0, 5)}`,
      html: `
      <h2>Nueva reserva</h2>
      <p><strong>Socio:</strong> ${profile?.full_name ?? user.email ?? 'Sin nombre'}</p>
      <p><strong>Pista:</strong> ${courtData?.name ?? 'Pista'}</p>
      <p><strong>Fecha:</strong> ${dateFormatted}</p>
      <p><strong>Hora:</strong> ${String(startTime).slice(0, 5)} - ${String(endTime).slice(0, 5)}</p>
      <p><strong>Pago:</strong> ${isActiveMember ? 'Monedero socio' : 'Monedero'}</p>
    `,
    }).catch((e) => console.error('SendGrid booking notification error (monedero):', e));
  }).catch((e) => console.error('SendGrid court fetch error (monedero):', e));

  return NextResponse.json({ ok: true });
}
