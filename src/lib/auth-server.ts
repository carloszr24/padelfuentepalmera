import { cache } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type Profile = {
  full_name: string | null;
  wallet_balance: number | null;
  role: string | null;
} | null;

/**
 * Auth + perfil en caché por request. Evita llamar getUser() y profile
 * varias veces en el mismo render (layout + page).
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, wallet_balance, role')
    .eq('id', user.id)
    .single();

  return {
    user,
    profile: profile as Profile,
    supabase,
  };
});
