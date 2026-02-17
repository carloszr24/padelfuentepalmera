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

  const { data, error } = await supabase
    .from('schedule_exceptions')
    .select('id, exception_date, end_date, is_open, open_time, close_time, label')
    .order('exception_date', { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  return NextResponse.json({ exceptions: data ?? [] });
}

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

  let body: {
    exception_date?: string;
    end_date?: string;
    is_open?: boolean;
    open_time?: string;
    close_time?: string;
    label?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body inválido' }, { status: 400 });
  }

  const exceptionDate = body.exception_date?.trim();
  if (!exceptionDate || !/^\d{4}-\d{2}-\d{2}$/.test(exceptionDate)) {
    return NextResponse.json({ message: 'exception_date obligatorio (yyyy-mm-dd)' }, { status: 400 });
  }

  const endDate = body.end_date?.trim();
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ message: 'end_date debe ser yyyy-mm-dd si se envía' }, { status: 400 });
  }

  const isOpen = Boolean(body.is_open);
  const openTime = isOpen && body.open_time ? body.open_time : null;
  const closeTime = isOpen && body.close_time ? body.close_time : null;
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 200) : null;

  const { data: inserted, error } = await supabase
    .from('schedule_exceptions')
    .insert({
      exception_date: exceptionDate,
      end_date: endDate || null,
      is_open: isOpen,
      open_time: openTime,
      close_time: closeTime,
      label: label || null,
    })
    .select('id, exception_date, end_date, is_open, open_time, close_time, label')
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json(inserted);
}
