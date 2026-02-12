import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/debug-wallet
 * Solo admins. Comprueba: env Stripe/Supabase y si la función wallet_recharge existe.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  }

  const stripeSecretSet = Boolean(process.env.STRIPE_SECRET_KEY);
  const webhookSecretSet = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  let supabaseServiceRoleSet = false;
  let walletRechargeStatus: 'exists' | 'missing' | string = 'unknown';

  try {
    createSupabaseServiceClient();
    supabaseServiceRoleSet = true;
  } catch {
    walletRechargeStatus = 'SUPABASE_SERVICE_ROLE_KEY no configurada';
    return NextResponse.json({
      stripeSecretSet,
      webhookSecretSet,
      supabaseServiceRoleSet: false,
      walletRechargeStatus,
      hint: 'Añade SUPABASE_SERVICE_ROLE_KEY en Vercel (Settings → Environment Variables) y redeploy.',
    });
  }

  const serviceSupabase = createSupabaseServiceClient();
  const { error } = await serviceSupabase.rpc('wallet_recharge', {
    p_user_id: user.id,
    p_amount: 0,
    p_description: null,
    p_stripe_session_id: null,
  });

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('Amount must be positive') || msg.includes('positive')) {
      walletRechargeStatus = 'exists';
    } else if (msg.includes('function') && msg.includes('does not exist')) {
      walletRechargeStatus = 'missing';
    } else {
      walletRechargeStatus = `error: ${msg}`;
    }
  } else {
    walletRechargeStatus = 'exists';
  }

  return NextResponse.json({
    stripeSecretSet,
    webhookSecretSet,
    supabaseServiceRoleSet,
    walletRechargeStatus,
    hint:
      walletRechargeStatus === 'missing'
        ? 'Ejecuta en Supabase (SQL Editor) el archivo supabase/verificar-monedero.sql para crear la función wallet_recharge.'
        : walletRechargeStatus === 'exists'
          ? 'Supabase y wallet_recharge OK. Si el saldo no sube, el fallo está en Stripe no llamando al webhook o STRIPE_WEBHOOK_SECRET incorrecto (usa el de producción en Stripe → Webhooks → tu endpoint → Signing secret).'
          : null,
  });
}
