import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
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

  const { data: weekly, error: weeklyError } = await supabase
    .from('club_schedule')
    .select('day_of_week, is_open, open_time, close_time')
    .order('day_of_week', { ascending: true });

  if (weeklyError) {
    return NextResponse.json({ message: weeklyError.message }, { status: 500 });
  }

  return NextResponse.json({ weekly: weekly ?? [] });
}

export async function PUT(request: Request) {
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

  let body: { weekly?: { day_of_week: number; is_open: boolean; open_time?: string; close_time?: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body inválido' }, { status: 400 });
  }

  const weekly = body.weekly;
  if (!Array.isArray(weekly) || weekly.length === 0) {
    return NextResponse.json({ message: 'weekly es obligatorio (array)' }, { status: 400 });
  }

  for (const row of weekly) {
    const day = Number(row.day_of_week);
    if (day < 1 || day > 7) {
      return NextResponse.json({ message: `day_of_week inválido: ${day}` }, { status: 400 });
    }
    const { error } = await supabase
      .from('club_schedule')
      .upsert(
        {
          day_of_week: day,
          is_open: Boolean(row.is_open),
          open_time: row.is_open && row.open_time ? row.open_time : null,
          close_time: row.is_open && row.close_time ? row.close_time : null,
        },
        { onConflict: 'day_of_week' }
      );
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
