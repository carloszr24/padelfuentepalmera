import { cache } from 'react';
import { createServerSupabaseClient, createSupabaseServiceClient } from '@/lib/supabase/server';

type Profile = {
  full_name: string | null;
  wallet_balance: number | null;
  role: string | null;
  has_debt?: boolean | null;
  debt_amount?: number | null;
} | null;

/**
 * Auth + perfil en caché por request. Evita llamar getUser() y profile
 * varias veces en el mismo render (layout + page).
 * Usa la API Admin para leer email_confirmed_at (no viene en el JWT).
 */
export const getCachedAuth = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, profile: null, supabase };
  }

  const serviceClient = createSupabaseServiceClient();
  const {
    data: { user: fullUser },
  } = await serviceClient.auth.admin.getUserById(user.id);
  const emailConfirmed = fullUser?.email_confirmed_at ?? null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, wallet_balance, role, has_debt, debt_amount')
    .eq('id', user.id)
    .single();

  return {
    user: { ...user, email_confirmed_at: emailConfirmed },
    profile: profile as Profile,
    supabase,
  };
});
