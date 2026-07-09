import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isValidUUID } from '@/lib/utils';
import { getExpectedDepositAmount } from '@/lib/booking-deposit';

type ChargeMethod = 'cash' | 'wallet' | 'bono';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit('admin', ip)) {
    return NextResponse.json({ message: 'Too Many Requests' }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { message: 'Solo administradores' },
      { status: 403 }
    );
  }

  const body = (await request.json()) as {
    bookingId?: string;
    method?: ChargeMethod;
    depositAmount?: number;
  };
  if (!body.bookingId) {
    return NextResponse.json(
      { message: 'Falta bookingId' },
      { status: 400 }
    );
  }
  if (!isValidUUID(body.bookingId)) {
    return NextResponse.json(
      { message: 'bookingId no válido' },
      { status: 400 }
    );
  }

  const method: ChargeMethod = body.method ?? 'cash';
  const service = createSupabaseServiceClient();

  const { data: booking, error: fetchError } = await service
    .from('bookings')
    .select('id, user_id, status, deposit_paid, pagado_con_bono, deposit_amount')
    .eq('id', body.bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json(
      { message: 'Reserva no encontrada' },
      { status: 404 }
    );
  }

  if (booking.deposit_paid || booking.pagado_con_bono) {
    return NextResponse.json(
      { message: 'El depósito ya está pagado' },
      { status: 409 }
    );
  }

  if (!['confirmed', 'blocked'].includes(booking.status)) {
    return NextResponse.json(
      { message: 'Estado de reserva no válido' },
      { status: 400 }
    );
  }

  if (!booking.user_id) {
    return NextResponse.json(
      { message: 'La reserva no tiene usuario asociado' },
      { status: 400 }
    );
  }

  const todayMadrid = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  const { data: memberRow } = await service
    .from('members')
    .select('user_id')
    .eq('user_id', booking.user_id)
    .gte('expiry_date', todayMadrid)
    .maybeSingle();

  const isMember = !!memberRow;
  const depositAmount =
    typeof body.depositAmount === 'number' && body.depositAmount > 0
      ? body.depositAmount
      : Number(booking.deposit_amount) > 0
        ? Number(booking.deposit_amount)
        : getExpectedDepositAmount(isMember);

  if (method === 'wallet') {
    const { error: walletError } = await service.rpc('admin_charge_booking_deposit_wallet', {
      p_booking_id: body.bookingId,
      p_deposit: depositAmount,
      p_admin_id: user.id,
    });

    if (walletError) {
      return NextResponse.json(
        { message: walletError.message ?? 'Error al cobrar del monedero' },
        { status: 400 }
      );
    }
  } else if (method === 'bono') {
    if (!isMember) {
      return NextResponse.json(
        { message: 'El bono solo está disponible para socios activos' },
        { status: 403 }
      );
    }

    let bonoApplyResult = await service.rpc('admin_apply_booking_bono', {
      p_booking_id: body.bookingId,
      p_admin_id: user.id,
      p_deposit: depositAmount,
    });

    // Fallback temporal mientras se aplica la función SQL nueva en Supabase.
    if (
      bonoApplyResult.error &&
      (bonoApplyResult.error.message ?? '').toLowerCase().includes('could not find the function')
    ) {
      const bonoResult = await service.rpc('usar_bono', { p_user_id: booking.user_id });
      if (bonoResult.error) {
        return NextResponse.json(
          { message: bonoResult.error.message ?? 'Error al usar el bono' },
          { status: 400 }
        );
      }
      if (bonoResult.data !== true) {
        return NextResponse.json(
          { message: 'Bono no disponible' },
          { status: 409 }
        );
      }

      bonoApplyResult = await service
        .from('bookings')
        .update({
          deposit_paid: true,
          pagado_con_bono: true,
          deposit_amount: depositAmount,
        })
        .eq('id', body.bookingId);
    }

    if (bonoApplyResult.error) {
      return NextResponse.json(
        { message: bonoApplyResult.error.message ?? 'Error al marcar reserva con bono' },
        { status: 400 }
      );
    }
  } else {
    const { error } = await service
      .from('bookings')
      .update({
        deposit_paid: true,
        deposit_amount: depositAmount,
      })
      .eq('id', body.bookingId)
      .in('status', ['confirmed', 'blocked']);

    if (error) {
      return NextResponse.json(
        { message: error.message ?? 'Error al marcar depósito pagado' },
        { status: 400 }
      );
    }
  }

  revalidatePath('/admin/reservas');
  return NextResponse.json({ ok: true });
}
