'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  bookingId: string;
  alreadyPaid: boolean;
};

export function AdminMarkRemainingPaidButton({ bookingId, alreadyPaid }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (alreadyPaid) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">
        Resto pagado
      </span>
    );
  }

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/bookings/mark-remaining-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
    >
      {loading ? '...' : 'Marcar resto pagado'}
    </button>
  );
}
