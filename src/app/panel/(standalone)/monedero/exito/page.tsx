'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Página estática ultraligera tras el pago con Stripe.
 * Sin queries a Supabase. Muestra mensaje y redirige a /panel/monedero en 2s
 * pasando session_id para que allí se acredite el saldo si hace falta.
 */
export default function MonederoExitoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('session_id') ?? '';

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (sessionId) {
        params.set('success', '1');
        params.set('session_id', sessionId);
      }
      router.replace(`/panel/monedero${params.toString() ? `?${params.toString()}` : ''}`);
    }, 2000);
    return () => clearTimeout(t);
  }, [router, sessionId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
          aria-hidden
        >
          <svg
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-stone-900">¡Pago completado!</h1>
        <p className="mt-2 text-sm text-stone-500">
          Tu saldo se actualizará en unos segundos.
        </p>
        <p className="mt-4 text-xs text-stone-400">Redirigiendo al monedero…</p>
      </div>
    </div>
  );
}
