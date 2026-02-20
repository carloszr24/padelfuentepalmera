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
const PERF_LOG = process.env.NODE_ENV === 'development' || process.env.PANEL_PERF_LOG === '1';

/**
 * Obtiene email_confirmed_at y perfil usando service role.
 * Cacheado por usuario (revalidate 60s) para no golpear Supabase en cada navegación.
 */
async function getProfileAndEmailConfirmed(userId: string): Promise<{
  emailConfirmed: string | null;
  profile: Profile;
}> {
  if (PERF_LOG) console.time('[panel] getProfileAndEmailConfirmed (parallel)');
  const service = createSupabaseServiceClient();
  const [userRes, profileRes] = await Promise.all([
    service.auth.admin.getUserById(userId),
    service
      .from('profiles')
      .select('full_name, wallet_balance, role, has_debt, debt_amount')
      .eq('id', userId)
      .single(),
  ]);
  if (PERF_LOG) console.timeEnd('[panel] getProfileAndEmailConfirmed (parallel)');
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
 * Usa getSession() primero (rápido, desde cookie) y solo getUser() si no hay sesión (validación en servidor).
 */
export const getCachedAuth = cache(async () => {
  const supabase = await createServerSupabaseClient();

  if (PERF_LOG) console.time('[panel] auth getSession');
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (PERF_LOG) console.timeEnd('[panel] auth getSession');

  let user = session?.user ?? null;
  if (sessionError || !user) {
    if (PERF_LOG) console.time('[panel] auth getUser (fallback)');
    const { data: { user: refreshedUser }, error } = await supabase.auth.getUser();
    if (PERF_LOG) console.timeEnd('[panel] auth getUser (fallback)');
    user = refreshedUser ?? null;
    if (error || !user) {
      return { user: null, profile: null, supabase };
    }
  }

  if (PERF_LOG) console.time('[panel] auth getCachedProfileAndEmail');
  const cached = await getCachedProfileAndEmail(user.id);
  if (PERF_LOG) console.timeEnd('[panel] auth getCachedProfileAndEmail');

  return {
    user: { ...user, email_confirmed_at: cached.emailConfirmed },
    profile: cached.profile,
    supabase,
  };
});
