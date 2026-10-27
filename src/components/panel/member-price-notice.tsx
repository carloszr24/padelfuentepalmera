'use client';

import { AlertTriangle } from 'lucide-react';
import { usePanelUser } from '@/contexts/panel-user-context';
import {
  MEMBER_PRICE_NOTICE_MESSAGE,
  MEMBER_PRICE_NOTICE_TITLE,
  isMemberPriceNoticeActive,
} from '@/lib/member-price-notice';

export function MemberPriceNotice() {
  const { isMember } = usePanelUser();
  if (!isMember || !isMemberPriceNoticeActive()) return null;

  return (
    <div
      role="status"
      className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <div>
        <p className="font-semibold text-amber-950">{MEMBER_PRICE_NOTICE_TITLE}</p>
        <p className="mt-1 leading-snug">{MEMBER_PRICE_NOTICE_MESSAGE}</p>
      </div>
    </div>
  );
}
