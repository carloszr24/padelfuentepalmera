'use client';

import { AlertTriangle } from 'lucide-react';
import { PAY_AT_CLUB_DISCLAIMER } from '@/lib/booking-payment-mode';

export function PayAtClubDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex gap-3 rounded-r-lg border-l-[3px] py-3 pl-4 pr-4 text-sm text-stone-700 ${className}`}
      style={{ backgroundColor: '#eff6ff', borderLeftColor: '#1d4ed8' }}
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-[#1d4ed8]" aria-hidden />
      <div>
        <p className="font-semibold text-stone-900">Pago en el club (medida temporal)</p>
        <p className="mt-1 leading-snug">{PAY_AT_CLUB_DISCLAIMER}</p>
      </div>
    </div>
  );
}
