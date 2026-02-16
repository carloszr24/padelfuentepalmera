'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  bookingId: string;
};

export function AdminCancelBookingButton({ bookingId }: Props) {
  const [open, setOpen] = useState(false);
  const [refundDeposit, setRefundDeposit] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, refundDeposit }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message ?? 'Error al cancelar');
        setLoading(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      alert('Error de conexión');
    }
    setLoading(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
      >
        Cancelar
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-stone-900">Cancelar reserva (admin)</h3>
            <p className="mt-2 text-xs text-stone-600">
              La reserva se cancelará sin penalización. Puedes elegir si devolver la señal al usuario.
            </p>
            <label className="mt-4 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={refundDeposit}
                onChange={(e) => setRefundDeposit(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300"
              />
              <span className="text-sm font-medium text-stone-700">Devolver señal al usuario</span>
            </label>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? '...' : 'Confirmar cancelación'}
              </button>
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                disabled={loading}
                className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
