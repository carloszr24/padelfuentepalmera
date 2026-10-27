'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { usePanelUser } from '@/contexts/panel-user-context';
import {
  MEMBER_PRICE_NOTICE_MESSAGE,
  MEMBER_PRICE_NOTICE_TITLE,
  isMemberPriceNoticeActive,
} from '@/lib/member-price-notice';

function storageKey(userId: string) {
  return `fp_member_price_notice_v1_${userId}`;
}

export function MemberPriceNoticeModal({ userId }: { userId: string }) {
  const { isMember } = usePanelUser();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId || !isMember || !isMemberPriceNoticeActive()) return;
    try {
      if (window.sessionStorage.getItem(storageKey(userId))) return;
    } catch {
      /* almacenamiento bloqueado: se muestra igualmente */
    }
    setOpen(true);
  }, [userId, isMember]);

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(storageKey(userId), '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-price-notice-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar aviso"
        onClick={dismiss}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" aria-hidden />
          <div>
            <h2 id="member-price-notice-title" className="text-lg font-bold text-stone-900">
              {MEMBER_PRICE_NOTICE_TITLE}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">{MEMBER_PRICE_NOTICE_MESSAGE}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="mt-5 min-h-[44px] w-full rounded-xl bg-[#1d4ed8] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#2563eb]"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
