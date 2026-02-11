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

  const startNormalized = startTime.length === 5 ? `${startTime}:00` : startTime;
  const endNormalized = endTime.length === 5 ? `${endTime}:00` : endTime;

  const { error } = await supabase.from('court_schedules').insert({
    court_id: courtId,
    blocked_date: blockedDate.trim().slice(0, 10),
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

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
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

  const { error } = await supabase.from('court_schedules').delete().eq('id', id);

  if (error) {
    return NextResponse.json(
      { message: error.message ?? 'Error al eliminar el bloque' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
