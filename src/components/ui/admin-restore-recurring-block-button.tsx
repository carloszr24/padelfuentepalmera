'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  recurringBlockId: string;
  exceptionDate: string;
  courtName?: string;
  startTime?: string;
  label?: string;
  onRestored?: () => void;
};

export function AdminRestoreRecurringBlockButton({
  recurringBlockId,
  exceptionDate,
  courtName,
  startTime,
  label = 'Restaurar bloqueo',
  onRestored,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    const dateLabel = new Date(exceptionDate + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const detail = [courtName, startTime?.slice(0, 5), dateLabel].filter(Boolean).join(' · ');
    if (
      !confirm(
        `¿Restaurar el bloqueo solo el ${dateLabel}?\n\n${detail}\n\nLa pista dejará de estar disponible para reservas ese día. El resto de semanas no cambia.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        recurring_block_id: recurringBlockId,
        exception_date: exceptionDate,
      });
      const res = await fetch(`/api/admin/recurring-block-exceptions?${params}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message ?? 'Error al restaurar el bloqueo');
        return;
      }
      onRestored?.();
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
      onClick={handleRestore}
      disabled={loading}
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
    >
      {loading ? 'Restaurando…' : label}
    </button>
  );
}
