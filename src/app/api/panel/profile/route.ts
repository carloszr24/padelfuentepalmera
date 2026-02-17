import { getCachedAuth } from '@/lib/auth-server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/panel/profile
 * Devuelve el perfil del usuario actual para refrescar el contexto del panel.
 * Siempre lee el perfil reciente de la BD (sin caché) para que el saldo se actualice
 * al instante tras recargas, cancelaciones, etc.
 */
export async function GET() {
  const { user } = await getCachedAuth();
  if (!user) {
    return new Response(JSON.stringify({ profile: null }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const supabase = createSupabaseServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, wallet_balance, role, has_debt, debt_amount')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return new Response(JSON.stringify({ profile: null }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return Response.json({
    profile: {
      full_name: profile.full_name,
      wallet_balance: profile.wallet_balance,
      role: profile.role,
      has_debt: profile.has_debt,
      debt_amount: profile.debt_amount,
    },
  });
}
