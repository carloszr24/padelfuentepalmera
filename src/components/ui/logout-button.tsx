'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLogout = () => {
    startTransition(async () => {
      const supabase = getBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="mt-auto inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}
    </button>
  );
}

