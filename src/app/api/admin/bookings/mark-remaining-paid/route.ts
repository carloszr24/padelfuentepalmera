import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
    return NextResponse.json(
      { message: 'Solo administradores' },
      { status: 403 }
    );
  }

  const body = (await request.json()) as { bookingId?: string };
  if (!body.bookingId) {
    return NextResponse.json(
      { message: 'Falta bookingId' },
      { status: 400 }
    );
  }

  const { error } = await supabase.rpc('admin_mark_remaining_paid', {
    p_booking_id: body.bookingId,
  });

  if (error) {
    return NextResponse.json(
      { message: error.message ?? 'Error al marcar' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
