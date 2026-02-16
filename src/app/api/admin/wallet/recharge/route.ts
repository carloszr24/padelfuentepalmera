import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isValidUUID } from '@/lib/utils';

const MAX_RECHARGE_EUR = 500;
const MAX_SUBTRACT_EUR = 500;

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit('admin', ip)) {
    return NextResponse.json({ message: 'Too Many Requests' }, { status: 429 });
  }
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
  if (!isValidUUID(userId)) {
    return NextResponse.json(
      { message: 'userId no válido' },
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
  if (numAmount > MAX_RECHARGE_EUR) {
    return NextResponse.json(
      { message: `Recarga máxima: ${MAX_RECHARGE_EUR} €` },
      { status: 400 }
    );
  }
  if (numAmount < -MAX_SUBTRACT_EUR) {
    return NextResponse.json(
      { message: `Resta máxima: ${MAX_SUBTRACT_EUR} €` },
      { status: 400 }
    );
  }

  if (numAmount < 0) {
    const serviceClient = createSupabaseServiceClient();
    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();
    const balance = Number((targetProfile as { wallet_balance?: number } | null)?.wallet_balance ?? 0);
    if (balance + numAmount < 0) {
      return NextResponse.json(
        { message: 'El usuario no tiene saldo suficiente para esta resta' },
        { status: 400 }
      );
    }
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

