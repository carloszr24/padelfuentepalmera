'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  bookingId: string;
};

export function AdminNoshowButton({ bookingId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAction = async (chargePenalty: boolean) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/bookings/noshow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, chargePenalty }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message ?? 'Error');
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
        className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
      >
        No-show
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[calc(100vw-32px)] max-w-sm rounded-2xl border border-stone-200 bg-white p-4 shadow-xl md:p-5">
            <h3 className="text-sm font-bold text-stone-900">Marcar no-show</h3>
            <p className="mt-2 text-xs text-stone-600">
              El usuario no se ha presentado. ¿Cobrar el resto de la reserva (13,50€) de su monedero?
            </p>
            <div className="mt-5 flex min-h-[44px] flex-col gap-2 md:flex-row md:flex-wrap">
              <button
                type="button"
                onClick={() => handleAction(true)}
                disabled={loading}
                className="min-h-[44px] w-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60 md:w-auto"
              >
                {loading ? '...' : 'Cobrar penalización'}
              </button>
              <button
                type="button"
                onClick={() => handleAction(false)}
                disabled={loading}
                className="min-h-[44px] w-full rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100 md:w-auto"
              >
                Dejar pasar
              </button>
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                disabled={loading}
                className="min-h-[44px] w-full rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 md:w-auto"
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
