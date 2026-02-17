'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const DEPOSIT_EUR = 4.5;
const REST_EUR = 13.5;

type Props = {
  bookingId: string;
  depositPaid: boolean;
  status: string;
  /** Fecha de la reserva (YYYY-MM-DD) para calcular si faltan más o menos de 24h */
  bookingDate?: string;
  /** Hora de inicio (HH:MM o HH:MM:SS) */
  startTime?: string;
  /** Saldo del monedero del usuario (para cancelación tardía: debe poder pagar 13,50€) */
  walletBalance?: number;
  className?: string;
  /** Llamado tras cancelar con éxito (para refrescar lista sin recargar) */
  onCancelSuccess?: () => void;
};

/** Devuelve true si el inicio de la reserva es al menos 24h en el futuro (en hora local España). */
function isAtLeast24hAway(bookingDate: string, startTime: string): boolean {
  const start = new Date(`${bookingDate}T${startTime.slice(0, 5)}`);
  return start.getTime() > Date.now() + TWENTY_FOUR_HOURS_MS;
}

export function CancelBookingButton({
  bookingId,
  depositPaid,
  status,
  bookingDate,
  startTime,
  walletBalance = 0,
  className = '',
  onCancelSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  const atLeast24h =
    !bookingDate || !startTime
      ? true
      : isAtLeast24hAway(bookingDate, startTime);
  const canCancel = status === 'confirmed';
  const isLateCancellation = canCancel && !atLeast24h && depositPaid;
  const hasEnoughForPenalty = walletBalance >= REST_EUR;

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
      onCancelSuccess?.();
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
          className="min-h-[44px] min-w-[44px] rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 sm:rounded-full sm:px-3 sm:py-1 sm:text-[11px]"
        >
          Cancelar reserva
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {atLeast24h ? (
            <p className="text-xs font-medium text-stone-600">
              Se te devolverán <span className="whitespace-nowrap">{DEPOSIT_EUR.toFixed(2).replace('.', ',')} €</span> a tu monedero. ¿Confirmar cancelación?
            </p>
          ) : isLateCancellation ? (
            <p className="text-xs font-medium text-stone-600">
              Cancelación tardía: no se devuelve la señal (<span className="whitespace-nowrap">{DEPOSIT_EUR.toFixed(2).replace('.', ',')} €</span>) y se cobrará el resto (<span className="whitespace-nowrap">{REST_EUR.toFixed(2).replace('.', ',')} €</span>) de tu monedero.
              {!hasEnoughForPenalty && (
                <span className="mt-1 block font-semibold text-amber-700">
                  No tienes saldo suficiente: quedará como deuda y deberás recargar antes de poder reservar de nuevo.
                </span>
              )}
              {' '}¿Confirmar cancelación?
            </p>
          ) : (
            <p className="text-xs font-medium text-stone-600">¿Cancelar?</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="min-h-[44px] w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 sm:w-auto sm:rounded-full sm:px-3 sm:py-1 sm:text-[11px]"
            >
              {loading ? '...' : 'Sí, cancelar'}
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              disabled={loading}
              className="min-h-[44px] w-full rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 sm:w-auto sm:rounded-full sm:px-3 sm:py-1 sm:text-[11px]"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
