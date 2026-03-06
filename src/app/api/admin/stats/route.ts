import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

type PeriodKey = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

function sinceDate(period: PeriodKey): Date | null {
  const now = new Date();
  const d = new Date(now);
  switch (period) {
    case '7d':
      d.setDate(d.getDate() - 7);
      return d;
    case '1m':
      d.setMonth(d.getMonth() - 1);
      return d;
    case '3m':
      d.setMonth(d.getMonth() - 3);
      return d;
    case '6m':
      d.setMonth(d.getMonth() - 6);
      return d;
    case '1y':
      d.setFullYear(d.getFullYear() - 1);
      return d;
    case 'all':
      return null;
    default:
      d.setMonth(d.getMonth() - 1);
      return d;
  }
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateParam(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  if (!checkRateLimit('admin', ip)) {
    return NextResponse.json({ message: 'Too Many Requests' }, { status: 429 });
  }

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  const { data: profile } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ message: 'Solo administradores' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') ?? '1y') as PeriodKey;
  const dateParam = searchParams.get('date')?.trim() ?? null;

  if (dateParam !== null && dateParam !== '' && !isValidDateParam(dateParam)) {
    return NextResponse.json(
      { message: 'Parámetro date debe ser una fecha válida en formato YYYY-MM-DD' },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceClient();

  if (dateParam) {
    const dateStart = `${dateParam}T00:00:00.000Z`;
    const dateEnd = `${dateParam}T23:59:59.999Z`;
    const { data: dayRows, error: dayError } = await supabase
      .from('transactions')
      .select('id, type, amount, created_at, user_id, profiles!transactions_user_id_fkey(full_name)')
      .in('type', ['recharge', 'admin_recharge'])
      .gt('amount', 0)
      .gte('created_at', dateStart)
      .lte('created_at', dateEnd)
      .order('created_at', { ascending: true });

    if (dayError) {
      return NextResponse.json(
        { message: dayError.message ?? 'Error al cargar estadísticas' },
        { status: 500 }
      );
    }

    type Row = {
      id: string;
      type: string;
      amount: number;
      created_at: string;
      profiles: { full_name: string | null } | { full_name: string | null }[] | null;
    };
    const list: Row[] = (dayRows ?? []) as unknown as Row[];
    let totalIncome = 0;
    let totalFees = 0;
    const transactions = list.map((tx) => {
      const amount = Number(tx.amount);
      totalIncome += amount;
      const profile = tx.profiles;
      const full_name = Array.isArray(profile) ? profile[0]?.full_name ?? null : (profile?.full_name ?? null);
      return {
        created_at: tx.created_at,
        full_name: full_name ?? null,
        type: tx.type === 'recharge' ? 'Tarjeta' : 'Admin',
        amount: Math.round(amount * 100) / 100,
        fee: 0,
      };
    });

    return NextResponse.json({
      months: [],
      daily: [],
      totals: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalCardFees: 0,
        totalNet: Math.round(totalIncome * 100) / 100,
        txCount: list.length,
      },
      date: dateParam,
      transactions,
    });
  }

  const since = sinceDate(period);
  let query = supabase
    .from('transactions')
    .select('id, type, amount, created_at')
    .in('type', ['recharge', 'admin_recharge'])
    .gt('amount', 0);

  if (since) {
    query = query.gte('created_at', since.toISOString());
  }

  const { data: rows, error } = await query.order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json(
      { message: error.message ?? 'Error al cargar estadísticas' },
      { status: 500 }
    );
  }

  const txList = (rows ?? []) as { id: string; type: string; amount: number; created_at: string }[];

  const monthMap: Record<
    string,
    { cardIncome: number; adminIncome: number; txCount: number }
  > = {};
  const dayMap: Record<string, { income: number }> = {};

  const monthKeys: string[] = [];
  const dayKeys: string[] = [];

  for (const tx of txList) {
    const amount = Number(tx.amount);
    const date = new Date(tx.created_at);
    const monthKey = date.toISOString().slice(0, 7);
    const dayKey = date.toISOString().slice(0, 10);

    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { cardIncome: 0, adminIncome: 0, txCount: 0 };
      monthKeys.push(monthKey);
    }
    if (!dayMap[dayKey]) {
      dayMap[dayKey] = { income: 0 };
      dayKeys.push(dayKey);
    }

    if (tx.type === 'recharge') {
      monthMap[monthKey].cardIncome += amount;
      monthMap[monthKey].txCount += 1;
      dayMap[dayKey].income += amount;
    } else if (tx.type === 'admin_recharge') {
      monthMap[monthKey].adminIncome += amount;
      monthMap[monthKey].txCount += 1;
      dayMap[dayKey].income += amount;
    }
  }

  const months = [...new Set(monthKeys)].sort().map((month) => {
    const m = monthMap[month];
    const totalIncome = m.cardIncome + m.adminIncome;
    return {
      month,
      cardIncome: Math.round(m.cardIncome * 100) / 100,
      adminIncome: Math.round(m.adminIncome * 100) / 100,
      cardFees: 0,
      netProfit: Math.round(totalIncome * 100) / 100,
      txCount: m.txCount,
    };
  });

  const last30Days = (() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    const out: { date: string; income: number; net: number }[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const day = dayMap[key] ?? { income: 0 };
      out.push({
        date: key,
        income: Math.round(day.income * 100) / 100,
        net: Math.round(day.income * 100) / 100,
      });
    }
    return out;
  })();

  const totals = months.reduce(
    (acc, m) => ({
      totalIncome: acc.totalIncome + m.cardIncome + m.adminIncome,
      totalCardFees: 0,
      totalNet: acc.totalNet + m.cardIncome + m.adminIncome,
      txCount: acc.txCount + m.txCount,
    }),
    { totalIncome: 0, totalCardFees: 0, totalNet: 0, txCount: 0 }
  );
  totals.totalIncome = Math.round(totals.totalIncome * 100) / 100;
  totals.totalNet = Math.round(totals.totalNet * 100) / 100;

  return NextResponse.json({
    months,
    daily: last30Days,
    totals: {
      totalIncome: totals.totalIncome,
      totalCardFees: totals.totalCardFees,
      totalNet: totals.totalNet,
      txCount: totals.txCount,
    },
    date: null,
    transactions: null,
  });
}
