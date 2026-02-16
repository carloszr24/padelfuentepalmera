'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

type AdminCourtCardProps = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
};

export function AdminCourtCard({
  id,
  name,
  type,
  isActive,
}: AdminCourtCardProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = (nextActive: boolean) => {
    startTransition(async () => {
      await fetch('/api/admin/courts/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courtId: id, isActive: nextActive }),
      });
      router.refresh();
    });
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 text-sm shadow-sm">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-stone-500">Pista</p>
        <p className="text-base font-bold text-stone-900">{name}</p>
        <p className="text-xs font-medium text-stone-600">{type}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
            isActive
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {isActive ? 'Activa' : 'En mantenimiento'}
        </span>
        <div className="flex min-h-[44px] flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleToggle(!isActive)}
            disabled={isPending}
            className="min-h-[44px] min-w-[44px] rounded-xl border border-stone-300 px-3 py-2 text-[11px] font-bold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 md:rounded-full md:py-1"
          >
            {isActive ? 'Desactivar' : 'Activar'}
          </button>
          <a
            href="/admin/horarios-bloqueados"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-stone-300 px-3 py-2 text-[11px] font-bold text-stone-700 hover:bg-stone-100 md:rounded-full md:py-1"
          >
            Horarios bloqueados
          </a>
        </div>
      </div>
    </div>
  );
}

