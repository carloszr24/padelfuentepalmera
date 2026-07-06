'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDepositEur } from '@/lib/booking-deposit';

type Props = {
  bookingId: string;
  walletBalance: number;
  depositAmount: number;
  userId?: string | null;
  bonoRestantes: number;
  isMember: boolean;
};

type ChargeMethod = 'cash' | 'wallet' | 'bono';

export function AdminDepositActions({
  bookingId,
  walletBalance,
  depositAmount,
  userId,
  bonoRestantes,
  isMember,
}: Props) {
  const [loading, setLoading] = useState<ChargeMethod | null>(null);
  const router = useRouter();

  const canChargeWallet =
    !!userId && walletBalance >= depositAmount && depositAmount > 0;
  const canChargeBono = isMember && bonoRestantes > 0 && !!userId;

  const charge = async (method: ChargeMethod) => {
    setLoading(method);
    try {
      const res = await fetch('/api/admin/bookings/mark-deposit-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, method, depositAmount }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {canChargeWallet && (
        <button
          type="button"
          onClick={() => charge('wallet')}
          disabled={loading !== null}
          className="rounded-full border border-[#1d4ed8] bg-[#eff6ff] px-3 py-1 text-[11px] font-bold text-[#1d4ed8] hover:bg-[#dbeafe] disabled:opacity-50"
        >
          {loading === 'wallet'
            ? '...'
            : `Cobrar del monedero (${formatDepositEur(depositAmount)})`}
        </button>
      )}
      {canChargeBono && (
        <button
          type="button"
          onClick={() => charge('bono')}
          disabled={loading !== null}
          className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-800 hover:bg-violet-100 disabled:opacity-50"
        >
          {loading === 'bono' ? '...' : `Cobrar bono socio (${bonoRestantes} rest.)`}
        </button>
      )}
      <button
        type="button"
        onClick={() => charge('cash')}
        disabled={loading !== null}
        className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
      >
        {loading === 'cash' ? '...' : 'Marcar pagado (efectivo)'}
      </button>
    </div>
  );
}
