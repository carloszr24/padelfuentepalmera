import { getCachedAuth } from '@/lib/auth-server';

/**
 * GET /api/panel/profile
 * Devuelve el perfil del usuario actual para refrescar el contexto del panel sin recargar la página.
 */
export async function GET() {
  const { user, profile } = await getCachedAuth();
  if (!user || !profile) {
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
