import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit('admin', ip)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const { data: profile } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get('desde')?.trim().slice(0, 10);
  const hasta = searchParams.get('hasta')?.trim().slice(0, 10);

  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from('bookings')
    .select('id, booking_date, start_time, end_time, status, deposit_paid, remaining_paid_at, profiles!bookings_user_id_fkey(full_name, email), courts(name)')
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false });
  if (desde) query = query.gte('booking_date', desde);
  if (hasta) query = query.lte('booking_date', hasta);
  const { data: bookings } = await query;

  const headers = ['Fecha', 'Hora inicio', 'Hora fin', 'Pista', 'Usuario', 'Email', 'Estado', 'Depósito pagado', 'Resto pagado'];
  const rows = (bookings ?? []).map((b: Record<string, unknown>) => {
    const p = b.profiles;
    const name = Array.isArray(p) ? (p[0] as { full_name?: string | null } | undefined)?.full_name : (p as { full_name?: string | null } | null)?.full_name;
    const email = Array.isArray(p) ? (p[0] as { email?: string | null } | undefined)?.email : (p as { email?: string | null } | null)?.email;
    const courtName = Array.isArray(b.courts) ? (b.courts[0] as { name?: string } | undefined)?.name : (b.courts as { name?: string } | null)?.name;
    return [
      b.booking_date,
      String(b.start_time).slice(0, 5),
      String(b.end_time).slice(0, 5),
      courtName ?? '',
      name ?? '',
      email ?? '',
      b.status,
      (b.deposit_paid as boolean) ? 'Sí' : 'No',
      (b.remaining_paid_at as string | null) ? 'Sí' : 'No',
    ].map((v) => escapeCsv(v as string | number | null | undefined)).join(';');
  });
  const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reservas-${desde || 'todo'}-${hasta || 'hoy'}.csv"`,
    },
  });
}
