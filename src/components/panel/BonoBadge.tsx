'use client';

import { useEffect, useState } from 'react';
import { usePanelUser } from '@/contexts/panel-user-context';

type BonoAvailability = {
  hasBono: boolean;
  restantes: number;
};

function Dot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full border ${active ? 'border-emerald-200 bg-emerald-200' : 'border-emerald-700/80 bg-transparent'}`}
      aria-hidden
    />
  );
}

export function BonoBadge() {
  const { isMember } = usePanelUser();
  const [loading, setLoading] = useState(true);
  const [bono, setBono] = useState<BonoAvailability>({ hasBono: false, restantes: 0 });

  useEffect(() => {
    let cancelled = false;

    if (!isMember) {
      setLoading(false);
      setBono({ hasBono: false, restantes: 0 });
      return;
    }

    setLoading(true);
    fetch('/api/panel/bono/availability', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setBono({
          hasBono: data?.hasBono === true,
          restantes: Math.max(0, Number(data?.restantes ?? 0)),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setBono({ hasBono: false, restantes: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isMember]);

  if (!isMember || loading || !bono.hasBono || bono.restantes <= 0) return null;

  const restantes = Math.min(3, bono.restantes);
  const usados = Math.max(0, 3 - restantes);

  return (
    <section className="rounded-[var(--panel-radius)] border border-emerald-800/60 bg-emerald-900 p-5 text-white shadow-[0_8px_24px_rgba(6,78,59,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold tracking-tight" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            🎾 Bono de Socio
          </p>
          <p className="mt-1 text-sm text-emerald-100">
            Te quedan {restantes} partido{restantes === 1 ? '' : 's'} gratuito{restantes === 1 ? '' : 's'}
          </p>
          <p className="mt-1 text-xs text-emerald-200/90">
            Se aplica automáticamente al reservar
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-700/70 bg-emerald-950/35 px-3 py-1.5">
          {Array.from({ length: restantes }).map((_, i) => (
            <Dot key={`restante-${i}`} active />
          ))}
          {Array.from({ length: usados }).map((_, i) => (
            <Dot key={`usado-${i}`} active={false} />
          ))}
        </div>
      </div>
    </section>
  );
}

