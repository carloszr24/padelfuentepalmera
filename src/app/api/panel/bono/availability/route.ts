import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ hasBono: false, restantes: 0 });
  }

  const { data } = await supabase
    .from('bonos_socio')
    .select('partidos_totales, partidos_usados')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ hasBono: false, restantes: 0 });
  }

  const restantes = Math.max(
    0,
    Number(data.partidos_totales ?? 0) - Number(data.partidos_usados ?? 0)
  );

  return NextResponse.json({ hasBono: restantes > 0, restantes });
}

