'use client';

import Link from 'next/link';
import { CLUB_LOGO_PATH } from '@/lib/club-logo';
import { usePathname } from 'next/navigation';
import { useRef, useEffect, useState } from 'react';
import { usePanelUser } from '@/contexts/panel-user-context';
import { LogoutButton } from '@/components/ui/logout-button';

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 hidden h-16 items-center justify-between px-6 md:flex md:px-8"
      style={{ background: 'var(--panel-sidebar-bg)' }}
      aria-label="Navegación principal"
    >
      <div className="flex items-center gap-3.5">
        <Link href="/panel" className="flex flex-shrink-0 items-center" aria-label="Inicio" prefetch>
          <img
            src={CLUB_LOGO_PATH}
            alt="Fuente Palmera Pádel"
            className="h-10 w-auto object-contain"
            width={40}
            height={40}
          />
        </Link>
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

      <div className="relative flex items-center gap-4" ref={dropdownRef}>
        <div className="hidden items-center gap-2 text-[13px] text-[var(--panel-sidebar-text)] sm:flex">
          Saldo: <strong className="text-[15px] font-semibold text-white">{Number(balance).toFixed(2).replace('.', ',')} €</strong>
        </div>
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/50"
          style={{ background: 'linear-gradient(135deg, var(--panel-accent), #7c3aed)' }}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          aria-label="Abrir menú de cuenta"
        >
          {initial}
        </button>
        {dropdownOpen && (
          <div
            className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-[12px] border border-stone-200 bg-white py-2 shadow-lg"
            role="menu"
          >
            <p className="border-b border-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-900" role="presentation">
              {displayName || 'Usuario'}
            </p>
            {isAdmin && (
              <Link
                href="/admin"
                prefetch
                className="block px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
              >
                Panel administrador
              </Link>
            )}
            <Link
              href="/"
              prefetch
              className="block px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
              role="menuitem"
              onClick={() => setDropdownOpen(false)}
            >
              Volver a la web
            </Link>
            <div className="mt-1 border-t border-stone-100 pt-1">
              <LogoutButton variant="dropdown" className="rounded-none border-0 px-4" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
