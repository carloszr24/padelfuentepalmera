import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { sendClubNotification } from '@/lib/sendgrid';
import { getOpeningForDate } from '@/lib/club-schedule';
import { isSameDayMadridTooSoon, minutesFromClock } from '@/lib/booking-lead-time';
import { checkRateLimit } from '@/lib/rate-limit';
import { isValidUUID } from '@/lib/utils';

// #region agent log
function dbgLog(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  const entry = JSON.stringify({ sessionId: '68ad37', hypothesisId, location, message, data, timestamp: Date.now() });
  console.error('[DBG-68ad37]', entry);
  fetch('http://127.0.0.1:7925/ingest/b946c3ce-2e52-4378-b9f6-afbd4bfaf00a', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '68ad37' }, body: entry }).catch(() => {});
}
// #endregion

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

  // Comprobar deuda y membresía en paralelo
  const serviceSupabase = createSupabaseServiceClient();
  const [profileRes, membershipRes] = await Promise.all([
    supabase.from('profiles').select('has_debt, wallet_balance, full_name, role').eq('id', user.id).single(),
    serviceSupabase.from('members').select('expiry_date, is_paid').eq('user_id', user.id).maybeSingle(),
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

  // #region agent log
  dbgLog('A-C', 'create/route.ts:after-deposit-calc', 'booking_attempt_state', { userId: user.id, isAdmin, isActiveMember, metodoPago, deposit, balance, hasDebt, bookingDate, courtId });
  // #endregion

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

  const opening = await getOpeningForDate(bookingDate);
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

  if (isAdmin) {
    const startNormalized = String(startTime).length === 5 ? `${startTime}:00` : String(startTime);
    const endNormalized = String(endTime).length === 5 ? `${endTime}:00` : String(endTime);
    // #region agent log
    dbgLog('A', 'create/route.ts:admin-branch', 'taking_admin_path_no_wallet_deduction', { userId: user.id, role: profile?.role, fullNameNorm });
    // #endregion
    const adminCreate = await supabase.rpc('admin_create_booking', {
      p_user_id: user.id,
      p_court_id: courtId,
      p_booking_date: bookingDate,
      p_start_time: startNormalized,
      p_end_time: endNormalized,
    });

    if (adminCreate.error) {
      return NextResponse.json(
        { message: adminCreate.error.message ?? 'Error al crear la reserva' },
        { status: 400 }
      );
    }

    try {
      const { data: courtData } = await serviceSupabase
        .from('courts')
        .select('name')
        .eq('id', courtId)
        .single();

      const dateFormatted = new Date(`${bookingDate}T00:00:00`).toLocaleDateString('es-ES');
      await sendClubNotification({
        subject: `🎾 Nueva reserva — ${courtData?.name ?? 'Pista'} ${dateFormatted} ${String(startTime).slice(0, 5)}`,
        html: `
      <h2>Nueva reserva</h2>
      <p><strong>Socio:</strong> ${profile?.full_name ?? user.email ?? 'Sin nombre'}</p>
      <p><strong>Pista:</strong> ${courtData?.name ?? 'Pista'}</p>
      <p><strong>Fecha:</strong> ${dateFormatted}</p>
      <p><strong>Hora:</strong> ${String(startTime).slice(0, 5)} - ${String(endTime).slice(0, 5)}</p>
      <p><strong>Pago:</strong> Pendiente en club (admin)</p>
    `,
      });
    } catch (emailError) {
      console.error('SendGrid booking notification error (admin):', emailError);
    }

    return NextResponse.json({ ok: true, metodo_pago: 'admin', _debug: { path: 'admin', isAdmin, role: profile?.role, fullNameNorm, balance } });
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

    try {
      const { data: courtData } = await serviceSupabase
        .from('courts')
        .select('name')
        .eq('id', courtId)
        .single();

      const dateFormatted = new Date(`${bookingDate}T00:00:00`).toLocaleDateString('es-ES');

      await sendClubNotification({
        subject: `🎾 Nueva reserva — ${courtData?.name ?? 'Pista'} ${dateFormatted} ${String(startTime).slice(0, 5)}`,
        html: `
      <h2>Nueva reserva</h2>
      <p><strong>Socio:</strong> ${profile?.full_name ?? user.email ?? 'Sin nombre'}</p>
      <p><strong>Pista:</strong> ${courtData?.name ?? 'Pista'}</p>
      <p><strong>Fecha:</strong> ${dateFormatted}</p>
      <p><strong>Hora:</strong> ${String(startTime).slice(0, 5)} - ${String(endTime).slice(0, 5)}</p>
      <p><strong>Pago:</strong> Bono de socio</p>
    `,
      });
    } catch (emailError) {
      console.error('SendGrid booking notification error (bono):', emailError);
    }

    return NextResponse.json({ ok: true, metodo_pago: 'bono', _debug: { path: 'bono', isActiveMember, balance } });
  }

  let rpcResult = await supabase.rpc('booking_pay_deposit', {
    p_user_id: user.id,
    p_court_id: courtId,
    p_booking_date: bookingDate,
    p_start_time: startTime,
    p_end_time: endTime,
    p_deposit: deposit,
  });

  // #region agent log
  dbgLog('B-C-E', 'create/route.ts:after-rpc-6param', 'rpc_6param_result', { error: rpcResult.error?.message ?? null, data: rpcResult.data, deposit });
  // #endregion

  // Si la función aún no tiene el parámetro p_deposit (migración pendiente), reintentar sin él
  if (
    rpcResult.error &&
    (rpcResult.error.message ?? '').toLowerCase().includes('could not find the function')
  ) {
    // #region agent log
    dbgLog('B', 'create/route.ts:fallback-branch', 'falling_back_to_5param_rpc', { originalError: rpcResult.error?.message });
    // #endregion
    rpcResult = await supabase.rpc('booking_pay_deposit', {
      p_user_id: user.id,
      p_court_id: courtId,
      p_booking_date: bookingDate,
      p_start_time: startTime,
      p_end_time: endTime,
    });
    // #region agent log
    dbgLog('B', 'create/route.ts:after-fallback-5param', 'rpc_5param_result', { error: rpcResult.error?.message ?? null, data: rpcResult.data });
    // #endregion
  }

  const { error } = rpcResult;

  if (error) {
    // #region agent log
    dbgLog('E', 'create/route.ts:final-error', 'rpc_final_error_returning_400', { error: error.message });
    // #endregion
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

  try {
    const { data: courtData } = await serviceSupabase
      .from('courts')
      .select('name')
      .eq('id', courtId)
      .single();

    const dateFormatted = new Date(`${bookingDate}T00:00:00`).toLocaleDateString('es-ES');

    await sendClubNotification({
      subject: `🎾 Nueva reserva — ${courtData?.name ?? 'Pista'} ${dateFormatted} ${String(startTime).slice(0, 5)}`,
      html: `
      <h2>Nueva reserva</h2>
      <p><strong>Socio:</strong> ${profile?.full_name ?? user.email ?? 'Sin nombre'}</p>
      <p><strong>Pista:</strong> ${courtData?.name ?? 'Pista'}</p>
      <p><strong>Fecha:</strong> ${dateFormatted}</p>
      <p><strong>Hora:</strong> ${String(startTime).slice(0, 5)} - ${String(endTime).slice(0, 5)}</p>
      <p><strong>Pago:</strong> ${isActiveMember ? 'Monedero' : 'Monedero (no socio)'}</p>
    `,
    });
  } catch (emailError) {
    console.error('SendGrid booking notification error (monedero):', emailError);
  }

  return NextResponse.json({ ok: true, _debug: { path: 'monedero', deposit, isAdmin, isActiveMember, balance, rpcData: rpcResult.data } });
}
