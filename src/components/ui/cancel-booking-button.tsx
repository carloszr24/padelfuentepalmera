'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  bookingId: string;
  depositPaid: boolean;
  status: string;
  /** Fecha de la reserva (YYYY-MM-DD) para comprobar antelación mínima de 1 h */
  bookingDate?: string;
  /** Hora de inicio (HH:MM o HH:MM:SS) para comprobar antelación mínima de 1 h */
  startTime?: string;
  className?: string;
};

const ONE_HOUR_MS = 60 * 60 * 1000;

export function CancelBookingButton({
  bookingId,
  depositPaid,
  status,
  bookingDate,
  startTime,
  className = '',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  const atLeastOneHourAway =
    !bookingDate || !startTime
      ? true
      : new Date(`${bookingDate}T${startTime.slice(0, 5)}`).getTime() > Date.now() + ONE_HOUR_MS;
  const canCancel = status === 'confirmed' && atLeastOneHourAway;

  const handleCancel = async () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || 'Error al cancelar');
        setLoading(false);
        setConfirm(false);
        return;
      }
      router.refresh();
    } catch {
      alert('Error de conexión');
    }
    setLoading(false);
    setConfirm(false);
  };

  if (!canCancel) return null;

  return (
    <div className={className}>
      {!confirm ? (
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
        >
          Cancelar reserva
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-600">
            {depositPaid ? 'Se reembolsará el depósito. ¿Continuar?' : '¿Cancelar?'}
          </span>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? '...' : 'Sí, cancelar'}
          </button>
          <button
            type="button"
            onClick={() => setConfirm(false)}
            disabled={loading}
            className="rounded-full border border-stone-300 px-3 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-100"
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}
