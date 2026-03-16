import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isValidUUID } from '@/lib/utils';

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
    return NextResponse.json({ message: 'Solo administradores' }, { status: 403 });
  }

  const body = (await request.json()) as {
    courtId?: string;
    blockedDate?: string;
    startTime?: string;
    endTime?: string;
    reason?: string;
  };

  const { courtId, blockedDate, startTime, endTime, reason } = body;
  if (!courtId || !blockedDate || !startTime || !endTime) {
    return NextResponse.json(
      { message: 'Faltan courtId, blockedDate, startTime o endTime' },
      { status: 400 }
    );
  }
  if (!isValidUUID(courtId)) {
    return NextResponse.json(
      { message: 'courtId no válido' },
      { status: 400 }
    );
  }

  const startNormalized = startTime.length === 5 ? `${startTime}:00` : startTime;
  const endNormalized = endTime.length === 5 ? `${endTime}:00` : endTime;

  const blockedDateNorm = blockedDate.trim().slice(0, 10);

  const { error } = await supabase.from('court_schedules').insert({
    court_id: courtId,
    blocked_date: blockedDateNorm,
    start_time: startNormalized,
    end_time: endNormalized,
    reason: reason?.trim() || null,
  });

  if (error) {
    return NextResponse.json(
      { message: error.message ?? 'Error al crear el bloque' },
      { status: 400 }
    );
  }

  // Crear también una \"reserva técnica\" para que el bloqueo se vea en los listados de reservas
  // Se usa el propio admin como user_id/created_by y status = 'blocked'
  await supabase.from('bookings').insert({
    user_id: user.id,
    court_id: courtId,
    booking_date: blockedDateNorm,
    start_time: startNormalized,
    end_time: endNormalized,
    status: 'blocked',
    deposit_paid: true,
    payment_method: 'pay_at_club',
    created_by: user.id,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
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
    return NextResponse.json({ message: 'Solo administradores' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ message: 'Falta el id del bloque' }, { status: 400 });
  }
  if (!isValidUUID(id)) {
    return NextResponse.json({ message: 'id no válido' }, { status: 400 });
  }

  // Leer primero el bloque para poder borrar la reserva técnica asociada
  const { data: block, error: fetchError } = await supabase
    .from('court_schedules')
    .select('court_id, blocked_date, start_time, end_time')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json(
      { message: fetchError.message ?? 'Error al cargar el bloque' },
      { status: 400 }
    );
  }

  const { error } = await supabase.from('court_schedules').delete().eq('id', id);

  if (error) {
    return NextResponse.json(
      { message: error.message ?? 'Error al eliminar el bloque' },
      { status: 400 }
    );
  }

  if (block) {
    const startNormalized =
      typeof block.start_time === 'string' && block.start_time.length === 5
        ? `${block.start_time}:00`
        : String(block.start_time);
    const endNormalized =
      typeof block.end_time === 'string' && block.end_time.length === 5
        ? `${block.end_time}:00`
        : String(block.end_time);

    await supabase
      .from('bookings')
      .delete()
      .match({
        court_id: block.court_id,
        booking_date: block.blocked_date,
        start_time: startNormalized,
        end_time: endNormalized,
        status: 'blocked',
      });
  }

  return NextResponse.json({ ok: true });
}
