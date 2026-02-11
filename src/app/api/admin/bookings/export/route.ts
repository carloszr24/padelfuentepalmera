import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
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

  const headers = ['Fecha', 'Hora inicio', 'Hora fin', 'Pista', 'Usuario', 'Email', 'Estado', 'Señal pagada', 'Resto pagado'];
  const rows = (bookings ?? []).map((b: {
    booking_date: string;
    start_time: string;
    end_time: string;
    status: string;
    deposit_paid: boolean;
    remaining_paid_at: string | null;
    profiles: { full_name: string | null; email: string | null } | null;
    courts: { name: string } | null;
  }) => {
    const p = b.profiles;
    const name = p && typeof p === 'object' && 'full_name' in p ? p.full_name : '';
    const email = p && typeof p === 'object' && 'email' in p ? p.email : '';
    return [
      b.booking_date,
      String(b.start_time).slice(0, 5),
      String(b.end_time).slice(0, 5),
      b.courts?.name ?? '',
      name ?? '',
      email ?? '',
      b.status,
      b.deposit_paid ? 'Sí' : 'No',
      b.remaining_paid_at ? 'Sí' : 'No',
    ].map(escapeCsv).join(';');
  });
  const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reservas-${desde || 'todo'}-${hasta || 'hoy'}.csv"`,
    },
  });
}
