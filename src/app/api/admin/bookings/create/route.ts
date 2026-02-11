import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
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
    userId?: string;
    courtId?: string;
    bookingDate?: string;
    startTime?: string;
    endTime?: string;
  };

  const { userId, courtId, bookingDate, startTime, endTime } = body;
  if (!userId || !courtId || !bookingDate || !startTime || !endTime) {
    return NextResponse.json(
      { message: 'Faltan userId, courtId, bookingDate, startTime o endTime' },
      { status: 400 }
    );
  }

  const startNormalized = startTime.length === 5 ? `${startTime}:00` : startTime;
  const endNormalized = endTime.length === 5 ? `${endTime}:00` : endTime;

  const { data: bookingId, error } = await supabase.rpc('admin_create_booking', {
    p_user_id: userId,
    p_court_id: courtId,
    p_booking_date: bookingDate,
    p_start_time: startNormalized,
    p_end_time: endNormalized,
  });

  if (error) {
    return NextResponse.json(
      { message: error.message ?? 'Error al crear la reserva' },
      { status: 400 }
    );
  }

  return NextResponse.json({ bookingId });
}
