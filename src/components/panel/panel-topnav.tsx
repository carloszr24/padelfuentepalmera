'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePanelUser } from '@/contexts/panel-user-context';

const NAV_LINKS = [
  { href: '/panel', label: 'Inicio' },
  { href: '/panel/reservas', label: 'Reservas' },
  { href: '/panel/monedero', label: 'Monedero' },
  { href: '/panel/perfil', label: 'Perfil' },
] as const;

export function PanelTopnav() {
  const pathname = usePathname();
  const { displayName, balance, isAdmin } = usePanelUser();
  const initial = (displayName || 'J').charAt(0).toUpperCase();

  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 hidden h-16 items-center justify-between px-6 md:flex md:px-8"
      style={{ background: 'var(--panel-sidebar-bg)' }}
      aria-label="Navegación principal"
    >
      <div className="flex items-center gap-3.5">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-[15px] font-bold text-white"
          style={{ background: 'var(--panel-accent)' }}
        >
          FP
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-white">
          Fuente Palmera <span className="ml-1 font-normal text-[var(--panel-sidebar-text)] text-[13px]">Pádel Club</span>
        </span>
      </div>

      <nav className="hidden items-center gap-0.5 md:flex">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = pathname === href || (href !== '/panel' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/12 text-white'
                  : 'text-[var(--panel-sidebar-text)] hover:bg-white/8 hover:text-white'
              }`}
            >
              {label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full"
                  style={{ background: 'var(--panel-accent)' }}
                />
              )}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            prefetch
            className="ml-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
          >
            Admin
          </Link>
        )}
      </nav>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 text-[13px] text-[var(--panel-sidebar-text)] sm:flex">
          Saldo: <strong className="text-[15px] font-semibold text-white">{Number(balance).toFixed(2).replace('.', ',')} €</strong>
        </div>
        <div
          className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--panel-accent), #7c3aed)' }}
        >
          {initial}
        </div>
      </div>
    </header>
  );
}
