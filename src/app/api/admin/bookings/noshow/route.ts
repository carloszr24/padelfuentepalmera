import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isValidUUID } from '@/lib/utils';

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => ({}))) as {
    bookingId?: string;
    chargePenalty?: boolean;
  };
  if (!body.bookingId) {
    return NextResponse.json(
      { message: 'Falta bookingId' },
      { status: 400 }
    );
  }
  if (!isValidUUID(body.bookingId)) {
    return NextResponse.json(
      { message: 'bookingId no válido' },
      { status: 400 }
    );
  }

  const { error } = await supabase.rpc('admin_mark_noshow', {
    p_booking_id: body.bookingId,
    p_charge_penalty: body.chargePenalty === true,
  });

  if (error) {
    return NextResponse.json(
      { message: error.message ?? 'Error al marcar no-show' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
