'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  success: boolean;
  sessionId: string | null;
  onCredited?: () => void;
};

/**
 * Al volver de Stripe con success=1 y session_id: muestra confirmación al instante.
 * Llama a confirm-session en segundo plano (plan B si el webhook no ha llegado).
 * No bloquea la UI; cuando confirm-session responde, actualiza el saldo.
 */
export function StripeSuccessCredit({ success, sessionId, onCredited }: Props) {
  const router = useRouter();
  const [credited, setCredited] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!success || !sessionId || sessionId.length < 10) return;

    let cancelled = false;
    fetch('/api/stripe/confirm-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setCredited(true);
          onCredited?.();
          router.refresh();
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [success, sessionId, router, onCredited]);

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        No se pudo acreditar automáticamente. Refresca la página o contacta con el club.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
      {credited ? 'Pago completado. Saldo acreditado.' : 'Pago completado. Tu saldo se actualizará en unos segundos.'}
    </div>
  );
}
