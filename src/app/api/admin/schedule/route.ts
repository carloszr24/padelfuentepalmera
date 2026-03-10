import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
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

  const { data: weekly, error: weeklyError } = await supabase
    .from('club_schedule')
    .select('day_of_week, is_open, morning_open, morning_close, afternoon_open, afternoon_close')
    .order('day_of_week', { ascending: true });

  if (weeklyError) {
    return NextResponse.json({ message: weeklyError.message }, { status: 500 });
  }

  return NextResponse.json({ weekly: weekly ?? [] });
}

export async function PUT(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
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

  let body: {
    weekly?: {
      day_of_week: number;
      is_open: boolean;
      morning_open?: string | null;
      morning_close?: string | null;
      afternoon_open?: string | null;
      afternoon_close?: string | null;
    }[];
  };
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
          morning_open: row.morning_open && row.morning_close ? row.morning_open : null,
          morning_close: row.morning_open && row.morning_close ? row.morning_close : null,
          afternoon_open: row.afternoon_open && row.afternoon_close ? row.afternoon_open : null,
          afternoon_close: row.afternoon_open && row.afternoon_close ? row.afternoon_close : null,
        },
        { onConflict: 'day_of_week' }
      );
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
