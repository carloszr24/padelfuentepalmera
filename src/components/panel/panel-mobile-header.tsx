'use client';

import Link from 'next/link';
import { usePanelUser } from '@/contexts/panel-user-context';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function PanelMobileHeader() {
  const { displayName } = usePanelUser();
  const initial = (displayName || 'J').charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between py-4 md:hidden">
      <div>
        <p className="text-[13px] font-medium text-[var(--panel-text-secondary)]">{getGreeting()}</p>
        <h1 className="font-bold tracking-tight text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '24px' }}>
          {displayName || 'Jugador'} 👋
        </h1>
      </div>
      <Link
        href="/panel/perfil"
        className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
        style={{ background: 'linear-gradient(135deg, var(--panel-accent), #7c3aed)' }}
      >
        {initial}
      </Link>
    </div>
  );
}
