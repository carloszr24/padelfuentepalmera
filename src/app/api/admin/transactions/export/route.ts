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

function getTransactionLabel(type: string): string {
  const map: Record<string, string> = {
    recharge: 'Recarga monedero',
    admin_recharge: 'Recarga admin',
    booking_deposit: 'Señal reserva',
    refund: 'Reembolso',
  };
  return map[type] ?? type;
}

export async function GET() {
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

  const supabase = createSupabaseServiceClient();
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, created_at, amount, type, description, profiles!transactions_user_id_fkey(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(2000);

  const headers = ['Fecha', 'Usuario', 'Email', 'Tipo', 'Descripción', 'Importe (€)'];
  const rows = (transactions ?? []).map((tx: {
    created_at: string;
    amount: number;
    type: string;
    description: string | null;
    profiles: { full_name: string | null; email: string | null } | null;
  }) => {
    const p = tx.profiles;
    const name = p && typeof p === 'object' && 'full_name' in p ? p.full_name : '';
    const email = p && typeof p === 'object' && 'email' in p ? p.email : '';
    const date = new Date(tx.created_at).toLocaleString('es-ES');
    return [
      date,
      name ?? '',
      email ?? '',
      getTransactionLabel(tx.type),
      tx.description ?? '',
      Number(tx.amount).toFixed(2),
    ].map(escapeCsv).join(';');
  });
  const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="transacciones-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
