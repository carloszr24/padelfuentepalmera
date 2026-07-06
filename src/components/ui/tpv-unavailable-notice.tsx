'use client';

import { AlertTriangle } from 'lucide-react';
import {
  BOOKING_TEMP_PAY_AT_CLUB_ONLY,
  TPV_UNAVAILABLE_MESSAGE,
  TPV_UNAVAILABLE_TITLE,
} from '@/lib/booking-payment-mode';

type Props = {
  className?: string;
  message?: string;
};

export function TpvUnavailableNotice({ className = '', message }: Props) {
  if (!BOOKING_TEMP_PAY_AT_CLUB_ONLY) return null;

  return (
    <div
      className={`flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`}
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <div>
        <p className="font-semibold text-amber-950">{TPV_UNAVAILABLE_TITLE}</p>
        <p className="mt-1 leading-snug">{message ?? TPV_UNAVAILABLE_MESSAGE}</p>
      </div>
    </div>
  );
}
