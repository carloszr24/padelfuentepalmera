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
  const [profileRes, memberRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, wallet_balance, role, has_debt, debt_amount, is_member')
      .eq('id', user.id)
      .single(),
    supabase
      .from('members')
      .select('expiry_date, is_paid')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  if (!profile) {
    return new Response(JSON.stringify({ profile: null }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const member = memberRes.data;
  const today = new Date().toISOString().slice(0, 10);
  const isMember =
    member?.is_paid === true &&
    member?.expiry_date != null &&
    member.expiry_date >= today;

  return Response.json({
    profile: {
      full_name: profile.full_name,
      wallet_balance: profile.wallet_balance,
      role: profile.role,
      has_debt: profile.has_debt,
      debt_amount: profile.debt_amount,
      is_member: isMember,
      member_expiry_date: member?.expiry_date ?? null,
    },
  });
}
