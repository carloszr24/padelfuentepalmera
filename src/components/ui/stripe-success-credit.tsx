'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  success: boolean;
  sessionId: string | null;
};

/**
 * Al volver de Stripe con success=1 y session_id, llama a confirm-session para acreditar
 * el saldo (plan B si el webhook no ha funcionado). Luego refresca para mostrar el saldo.
 */
export function StripeSuccessCredit({ success, sessionId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  useEffect(() => {
    if (!success || !sessionId || sessionId.length < 10) return;

    let cancelled = false;
    setStatus('loading');

    fetch('/api/stripe/confirm-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setStatus('ok');
          router.refresh();
        } else {
          setStatus('error');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [success, sessionId, router]);

  if (status === 'loading') {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
        Acreditando saldo…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        No se pudo acreditar automáticamente. Refresca la página o contacta con el club.
      </div>
    );
  }

  if (status === 'ok') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
        Pago completado. Saldo acreditado.
      </div>
    );
  }

  return null;
}
