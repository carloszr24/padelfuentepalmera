'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BOOKING_TEMP_PAY_AT_CLUB_ONLY } from '@/lib/booking-payment-mode';
import { TpvUnavailableNotice } from '@/components/ui/tpv-unavailable-notice';
import { WalletModal } from './wallet-modal';

function WalletRechargeButtonActive() {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (
      searchParams?.get('success') === '1' ||
      searchParams?.get('cancel') === '1' ||
      (searchParams?.get('session_id') ?? '').length > 10
    ) {
      setOpen(false);
    }
  }, [searchParams]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#1d4ed8' }}
      >
        Recargar monedero
      </button>
      <WalletModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function WalletRechargeButton() {
  if (BOOKING_TEMP_PAY_AT_CLUB_ONLY) {
    return <TpvUnavailableNotice />;
  }

  return <WalletRechargeButtonActive />;
}
