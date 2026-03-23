import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ hasBono: false, restantes: 0 }, { status: 401 });
  }

  // Service role para evitar problemas de RLS y devolver estado consistente
  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from('bonos_socio')
    .select('partidos_totales, partidos_usados')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ hasBono: false, restantes: 0 });
  }

  const total = Number(data.partidos_totales ?? 0);
  const usados = Number(data.partidos_usados ?? 0);
  const restantes = Math.max(0, total - usados);

  return NextResponse.json({
    hasBono: restantes > 0,
    restantes,
  });
}

