import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isValidUUID } from '@/lib/utils';

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

/** GET — Lista de bloqueos permanentes con nombre de pista */
export async function GET() {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const { supabase } = result;

  const [{ data: rows, error }, { data: courtsData }] = await Promise.all([
    supabase
      .from('recurring_blocks')
      .select('id, court_id, day_of_week, start_time, reason, created_at, courts(name)')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true }),
    supabase.from('courts').select('id, name').eq('is_active', true).order('name', { ascending: true }),
  ]);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const blocks = (rows ?? []).map((r) => ({
    id: r.id,
    court_id: r.court_id,
    court_name:
      (Array.isArray(r.courts) ? (r.courts[0] as { name?: string })?.name : (r.courts as { name?: string } | null)?.name) ??
      'Pista',
    day_of_week: r.day_of_week,
    start_time: typeof r.start_time === 'string' ? r.start_time.slice(0, 5) : String(r.start_time).slice(0, 5),
    reason: r.reason ?? null,
  }));

  const courts = (courtsData ?? []).map((c) => ({ id: String(c.id), name: c.name ?? '' }));

  return NextResponse.json({ blocks, courts });
}

/** POST — Crear bloqueo permanente */
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

  let body: { court_id?: string; day_of_week?: number; start_time?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body inválido' }, { status: 400 });
  }

  const court_id = typeof body.court_id === 'string' ? body.court_id.trim() : '';
  const day_of_week = typeof body.day_of_week === 'number' ? body.day_of_week : 0;
  const start_time = typeof body.start_time === 'string' ? body.start_time.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null;

  if (!court_id || !isValidUUID(court_id)) {
    return NextResponse.json({ message: 'court_id obligatorio y válido' }, { status: 400 });
  }
  if (day_of_week < 1 || day_of_week > 7) {
    return NextResponse.json({ message: 'day_of_week debe ser 1-7' }, { status: 400 });
  }
  const validStarts = ['09:30', '11:00', '12:30', '14:00', '16:30', '18:00', '19:30', '21:00'];
  const startNormalized = start_time.length === 5 ? start_time : start_time.slice(0, 5);
  if (!validStarts.includes(startNormalized)) {
    return NextResponse.json({ message: 'start_time no válido' }, { status: 400 });
  }

  const { error } = await supabase.from('recurring_blocks').insert({
    court_id,
    day_of_week,
    start_time: startNormalized + ':00',
    reason: reason || null,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ message: 'Ya existe un bloqueo para esa pista, día y hora' }, { status: 409 });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — Eliminar bloqueo permanente (query: id) */
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
  const id = searchParams.get('id');
  if (!id || !isValidUUID(id)) {
    return NextResponse.json({ message: 'id obligatorio y válido' }, { status: 400 });
  }

  const { error } = await supabase.from('recurring_blocks').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
