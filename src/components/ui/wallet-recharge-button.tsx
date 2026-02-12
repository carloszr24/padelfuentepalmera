'use client';

import { useState } from 'react';
import { WalletModal } from './wallet-modal';

export function WalletRechargeButton() {
  const [open, setOpen] = useState(false);
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
