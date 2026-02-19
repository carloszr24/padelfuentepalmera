'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/components/ui/logout-button';

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: 'M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z' },
  { href: '/admin/socios', label: 'Socios', icon: 'M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z' },
  { href: '/admin/reservas', label: 'Reservas', icon: 'M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' },
  { href: '/admin/estadisticas', label: 'Estadísticas', icon: 'M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z' },
  { href: '/admin/pistas', label: 'Pistas', icon: 'M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z' },
  { href: '/admin/horarios', label: 'Horarios', icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z' },
  { href: '/admin/monederos', label: 'Monederos', icon: 'M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z' },
  { href: '/admin/transacciones', label: 'Transacciones', icon: 'M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z' },
  { href: '/admin/finanzas', label: 'Finanzas', icon: 'M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z' },
] as const;

type AdminShellProps = {
  displayName: string;
  children: React.ReactNode;
};

const SIDEBAR_BG = '#1a1a1a';
const SIDEBAR_TEXT = '#a3a3a3';

function AdminSidebarDesktop() {
  const pathname = usePathname();
  return (
    <aside
      className="hidden w-[240px] flex-shrink-0 flex-col overflow-hidden rounded-[14px] border border-[#e8e8e4] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.06)] md:flex"
      style={{ background: SIDEBAR_BG }}
    >
      <div className="border-b border-white/[0.08] px-2 pb-5 pt-0 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#2563eb] mb-1">Admin</p>
        <p className="text-[15px] font-semibold text-white">Fuente Palmera</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_LINKS.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-white/10 text-white' : 'hover:bg-white/[0.06] hover:text-white'
              }`}
              style={{ color: isActive ? 'white' : SIDEBAR_TEXT }}
            >
              <svg className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'opacity-100' : 'opacity-60'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path fillRule="evenodd" d={icon} clipRule="evenodd" />
              </svg>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 border-t border-white/[0.08] pt-4">
        <LogoutButton />
      </div>
    </aside>
  );
}

function SidebarContent({
  displayName,
  onLinkClick,
}: {
  displayName: string;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="border-b border-white/[0.08] px-2 pb-5 pt-0 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#2563eb] mb-1">Admin</p>
        <p className="text-[15px] font-semibold text-white">Fuente Palmera</p>
      </div>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Modo Administrador
      </div>
      <Link
        href="/panel"
        onClick={onLinkClick}
        className="mb-4 inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
      >
        ← Panel usuario
      </Link>
      <div className="mb-6 rounded-[10px] bg-[#f7f7f5] p-4 text-sm text-[#6b6b6b]">
        <p className="text-xs font-semibold text-stone-500">Conectado como</p>
        <p className="mt-1 text-sm font-bold text-stone-900">{displayName}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 text-sm">
        {NAV_LINKS.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onLinkClick}
              className={`flex min-h-[44px] min-w-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-white/10 text-white' : 'text-[var(--panel-sidebar-text)] hover:bg-white/[0.06] hover:text-white'
              }`}
              style={isActive ? undefined : { color: SIDEBAR_TEXT }}
            >
              <svg className="h-[18px] w-[18px] shrink-0 opacity-60" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path fillRule="evenodd" d={icon} clipRule="evenodd" />
              </svg>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 border-t border-stone-200 pt-4">
        <LogoutButton />
      </div>
    </>
  );
}

export function AdminShell({ displayName, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex max-h-dvh max-md:h-dvh flex-col bg-[#f7f7f5] text-[#1a1a1a] md:max-h-none md:min-h-screen" style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}>
      <header className="z-20 flex flex-shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 shadow-sm md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700"
          aria-label="Abrir menú"
        >
          <span className="text-xl font-bold">☰</span>
        </button>
        <span className="text-sm font-bold text-stone-800">Admin</span>
      </header>

      <div
        role="button"
        tabIndex={0}
        onClick={() => setMobileOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[280px] max-w-[85vw] overflow-y-auto border-r border-stone-200 bg-white p-5 shadow-xl transition-transform duration-300 ease-out md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!mobileOpen}
      >
        <SidebarContent displayName={displayName} onLinkClick={() => setMobileOpen(false)} />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain md:overflow-visible md:overscroll-none" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="mx-auto flex w-full max-w-[1380px] flex-1 flex-col gap-6 px-4 py-4 md:flex-row md:px-6 md:py-6 lg:px-8" data-admin>
          <AdminSidebarDesktop />

          <main className="min-w-0 max-w-[1100px] flex-1 rounded-2xl border border-[#e8e8e4] bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.06)] md:p-8 lg:p-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
