import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createServerSupabaseClient, createSupabaseServiceClient } from '@/lib/supabase/server';

type Profile = {
  full_name: string | null;
  wallet_balance: number | null;
  role: string | null;
  has_debt?: boolean | null;
  debt_amount?: number | null;
} | null;

const PROFILE_CACHE_SECONDS = 60;

/**
 * Obtiene email_confirmed_at y perfil usando service role.
 * Cacheado por usuario (revalidate 60s) para no golpear Supabase en cada navegación.
 */
async function getProfileAndEmailConfirmed(userId: string): Promise<{
  emailConfirmed: string | null;
  profile: Profile;
}> {
  const service = createSupabaseServiceClient();
  const [userRes, profileRes] = await Promise.all([
    service.auth.admin.getUserById(userId),
    service
      .from('profiles')
      .select('full_name, wallet_balance, role, has_debt, debt_amount')
      .eq('id', userId)
      .single(),
  ]);
  const emailConfirmed = userRes.data?.user?.email_confirmed_at ?? null;
  const profile = (profileRes.data ?? null) as Profile;
  return { emailConfirmed, profile };
}

/** Cache de perfil por usuario (key incluye userId para no mezclar usuarios). */
function getCachedProfileAndEmail(userId: string) {
  return unstable_cache(
    async () => getProfileAndEmailConfirmed(userId),
    ['auth-profile', userId],
    { revalidate: PROFILE_CACHE_SECONDS }
  )();
}

/**
 * Auth + perfil en caché por request (layout + page) y por usuario (60s).
 * Una sola llamada getUser() por navegación; perfil/email desde cache cuando sea posible.
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

  const cached = await getCachedProfileAndEmail(user.id);

  return {
    user: { ...user, email_confirmed_at: cached.emailConfirmed },
    profile: cached.profile,
    supabase,
  };
});
