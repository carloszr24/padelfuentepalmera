import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

const VALID_PERIODS = ['7d', '1m', '3m', '6m', '1y', 'all'] as const;
type PeriodKey = (typeof VALID_PERIODS)[number];

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const cache = new Map<string, { data: unknown; expires: number }>();

function sinceDate(period: PeriodKey): { start: string | null; end: string | null } {
  const now = new Date();
  const end = now.toISOString();
  if (period === 'all') {
    return { start: null, end: null };
  }
  const d = new Date(now);
  switch (period) {
    case '7d':
      d.setDate(d.getDate() - 7);
      break;
    case '1m':
      d.setMonth(d.getMonth() - 1);
      break;
    case '3m':
      d.setMonth(d.getMonth() - 3);
      break;
    case '6m':
      d.setMonth(d.getMonth() - 6);
      break;
    case '1y':
      d.setFullYear(d.getFullYear() - 1);
      break;
    default:
      d.setMonth(d.getMonth() - 1);
  }
  return { start: d.toISOString(), end };
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
  const periodParam = searchParams.get('period') ?? '1m';
  const period = VALID_PERIODS.includes(periodParam as PeriodKey)
    ? (periodParam as PeriodKey)
    : '1m';

  const cacheKey = `bookings:${period}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return NextResponse.json(cached.data);
  }

  const { start, end } = sinceDate(period);
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase.rpc('get_booking_stats', {
    p_start: start,
    p_end: end,
  });

  if (error) {
    console.error('get_booking_stats RPC error:', error);
    return NextResponse.json(
      { message: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }

  cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
  return NextResponse.json(data);
}
