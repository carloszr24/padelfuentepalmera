import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { message: 'No autenticado' },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { message: 'Solo administradores pueden gestionar pistas' },
      { status: 403 }
    );
  }

  const { courtId, isActive } = (await request.json()) as {
    courtId?: string;
    isActive?: boolean;
  };

  if (!courtId || typeof isActive !== 'boolean') {
    return NextResponse.json(
      { message: 'Datos no válidos' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('courts')
    .update({ is_active: isActive })
    .eq('id', courtId);

  if (error) {
    return NextResponse.json(
      { message: error.message ?? 'Error al actualizar pista' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

