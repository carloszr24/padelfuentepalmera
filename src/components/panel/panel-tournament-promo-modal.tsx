'use client';

import { useEffect, useState } from 'react';
import {
  EVENPADEL_TOURNAMENT_URL,
  PANEL_TORNEO_PROMO_IMAGE,
} from '@/lib/evenpadel-tournament';

function storageKey(userId: string) {
  return `fp_panel_torneo_promo_v1_${userId}`;
}

function markSeen(userId: string) {
  try {
    window.localStorage.setItem(storageKey(userId), '1');
  } catch {
    /* private mode / quota */
  }
}

type PanelTournamentPromoModalProps = {
  userId: string;
};

export function PanelTournamentPromoModal({ userId }: PanelTournamentPromoModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    try {
      if (window.localStorage.getItem(storageKey(userId))) return;
    } catch {
      return;
    }
    setOpen(true);
  }, [userId]);

  const dismiss = () => {
    markSeen(userId);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="panel-torneo-promo-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar ventana del torneo"
        onClick={dismiss}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-[min(420px,calc(100vw-1.5rem))] flex-col rounded-2xl bg-stone-950 p-2 shadow-2xl ring-1 ring-white/10">
        <p id="panel-torneo-promo-title" className="sr-only">
          Torneo Even Padel Tour — Conferencia Noreste
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lg font-bold leading-none text-stone-800 shadow-md transition hover:bg-white"
          aria-label="Cerrar"
        >
          ×
        </button>
        <a
          href={EVENPADEL_TOURNAMENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#FFD700]"
          onClick={() => markSeen(userId)}
        >
          <img
            src={PANEL_TORNEO_PROMO_IMAGE}
            alt="Even Padel Tour — 12-14 junio. Abre la inscripción en EvenPadel."
            className="mx-auto max-h-[85vh] w-full object-contain"
            width={4800}
            height={6000}
          />
        </a>
      </div>
    </div>
  );
}
