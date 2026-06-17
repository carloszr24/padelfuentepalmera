'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  recurringBlockId: string;
  exceptionDate: string;
  courtName?: string;
  startTime?: string;
};

export function AdminReleaseRecurringBlockButton({
  recurringBlockId,
  exceptionDate,
  courtName,
  startTime,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRelease = async () => {
    const dateLabel = new Date(exceptionDate + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const detail = [courtName, startTime?.slice(0, 5), dateLabel].filter(Boolean).join(' · ');
    if (
      !confirm(
        `¿Liberar este bloqueo solo el ${dateLabel}?\n\n${detail}\n\nLa pista quedará disponible para reservas ese día. El bloqueo recurrente se mantendrá el resto de semanas.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/recurring-block-exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recurring_block_id: recurringBlockId,
          exception_date: exceptionDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message ?? 'Error al liberar el bloqueo');
        return;
      }
      router.refresh();
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRelease}
      disabled={loading}
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
    >
      {loading ? 'Liberando…' : 'Liberar solo este día'}
    </button>
  );
}
