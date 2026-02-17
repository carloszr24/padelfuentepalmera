'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

/**
 * Si el usuario ya tiene sesión con email confirmado, redirige a /panel.
 * Así las páginas de login/registro pueden ser estáticas y el redirect es en cliente.
 */
export function AuthRedirectIfLoggedIn({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBrowserSupabaseClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        if (session?.user) {
          router.replace('/panel');
          return;
        }
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-[#1d4ed8]" />
      </div>
    );
  }

  return <>{children}</>;
}
