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
      { message: 'Solo administradores pueden recargar monederos' },
      { status: 403 }
    );
  }

  const { userId, amount } = (await request.json()) as {
    userId?: string;
    amount?: number;
  };

  if (!userId || amount === undefined || amount === null || Number.isNaN(Number(amount))) {
    return NextResponse.json(
      { message: 'Datos no válidos' },
      { status: 400 }
    );
  }

  const numAmount = Number(amount);
  if (numAmount === 0) {
    return NextResponse.json(
      { message: 'La cantidad no puede ser 0' },
      { status: 400 }
    );
  }

  const { error } = await supabase.rpc('admin_wallet_recharge', {
    p_user_id: userId,
    p_amount: numAmount,
    p_description: numAmount > 0 ? 'Recarga directa desde panel admin' : 'Ajuste (resta) desde panel admin',
  });

  if (error) {
    return NextResponse.json(
      { message: error.message ?? 'Error al recargar monedero' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

