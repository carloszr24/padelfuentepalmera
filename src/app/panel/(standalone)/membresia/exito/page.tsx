'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export default function MembresiaExitoPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let attempts = 0;
    const MAX = 8;
    const INTERVAL = 1500;

    const poll = async () => {
      if (!active) return;
      try {
        const { data: { user } } = await getBrowserSupabaseClient().auth.getUser();
        if (user) {
          const { data: member } = await getBrowserSupabaseClient()
            .from('members')
            .select('is_paid, expiry_date')
            .eq('user_id', user.id)
            .maybeSingle();
          const today = new Date().toISOString().slice(0, 10);
          const isActive = member?.is_paid === true && member?.expiry_date != null && member.expiry_date >= today;
          if (isActive && active) {
            router.replace('/panel/membresia?success=1');
            return;
          }
        }
      } catch {
        // ignore
      }
      attempts++;
      if (active && attempts < MAX) {
        setTimeout(poll, INTERVAL);
      } else if (active) {
        router.replace('/panel/membresia?success=1');
      }
    };

    // Esperar 2s antes de empezar a sondear (dar tiempo al callback de Cecabank)
    const t = setTimeout(poll, 2000);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1d4ed8]/10 text-[#1d4ed8]"
          aria-hidden
        >
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-stone-900">¡Ya eres socio!</h1>
        <p className="mt-2 text-sm text-stone-500">
          Tu membresía se activará en unos segundos.
        </p>
        <p className="mt-4 text-xs text-stone-400">Redirigiendo a tu membresía…</p>
      </div>
    </div>
  );
}
