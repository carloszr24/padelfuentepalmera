import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isValidUUID } from '@/lib/utils';

function dayOfWeekFromDate(date: string): number {
  const d = new Date(date + 'T12:00:00');
  return d.getDay() === 0 ? 7 : d.getDay();
}

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ message: 'No autenticado' }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ message: 'Solo administradores' }, { status: 403 }) };
  }
  return { supabase };
}

/** POST — Liberar un bloqueo recurrente solo en una fecha concreta */
export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  if (!checkRateLimit('admin', ip)) {
    return NextResponse.json({ message: 'Too Many Requests' }, { status: 429 });
  }
  const result = await requireAdmin();
  if (result.error) return result.error;
  const { supabase } = result;

  let body: { recurring_block_id?: string; exception_date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body inválido' }, { status: 400 });
  }

  const recurring_block_id =
    typeof body.recurring_block_id === 'string' ? body.recurring_block_id.trim() : '';
  const exception_date =
    typeof body.exception_date === 'string' ? body.exception_date.trim().slice(0, 10) : '';

  if (!recurring_block_id || !isValidUUID(recurring_block_id)) {
    return NextResponse.json({ message: 'recurring_block_id obligatorio y válido' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(exception_date)) {
    return NextResponse.json({ message: 'exception_date debe ser yyyy-mm-dd' }, { status: 400 });
  }

  const { data: block, error: blockError } = await supabase
    .from('recurring_blocks')
    .select('id, day_of_week')
    .eq('id', recurring_block_id)
    .maybeSingle();

  if (blockError) {
    return NextResponse.json({ message: blockError.message }, { status: 500 });
  }
  if (!block) {
    return NextResponse.json({ message: 'Bloqueo recurrente no encontrado' }, { status: 404 });
  }

  if (dayOfWeekFromDate(exception_date) !== block.day_of_week) {
    return NextResponse.json(
      { message: 'La fecha no coincide con el día de la semana del bloqueo recurrente' },
      { status: 400 }
    );
  }

  const { error } = await supabase.from('recurring_block_exceptions').insert({
    recurring_block_id,
    exception_date,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { message: 'Ese día ya está liberado para este bloqueo' },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — Restaurar el bloqueo recurrente en una fecha (quitar excepción) */
export async function DELETE(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  if (!checkRateLimit('admin', ip)) {
    return NextResponse.json({ message: 'Too Many Requests' }, { status: 429 });
  }
  const result = await requireAdmin();
  if (result.error) return result.error;
  const { supabase } = result;

  const { searchParams } = new URL(request.url);
  const recurring_block_id = searchParams.get('recurring_block_id')?.trim() ?? '';
  const exception_date = searchParams.get('exception_date')?.trim().slice(0, 10) ?? '';

  if (!recurring_block_id || !isValidUUID(recurring_block_id)) {
    return NextResponse.json({ message: 'recurring_block_id obligatorio y válido' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(exception_date)) {
    return NextResponse.json({ message: 'exception_date debe ser yyyy-mm-dd' }, { status: 400 });
  }

  const { error } = await supabase
    .from('recurring_block_exceptions')
    .delete()
    .eq('recurring_block_id', recurring_block_id)
    .eq('exception_date', exception_date);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
