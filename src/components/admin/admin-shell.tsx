'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LogoutButton } from '@/components/ui/logout-button';

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/reservas', label: 'Reservas' },
  { href: '/admin/pistas', label: 'Pistas' },
  { href: '/admin/monederos', label: 'Monederos' },
  { href: '/admin/transacciones', label: 'Transacciones' },
  { href: '/admin/finanzas', label: 'Finanzas' },
] as const;

type AdminShellProps = {
  displayName: string;
  children: React.ReactNode;
};

function SidebarContent({
  displayName,
  onLinkClick,
}: {
  displayName: string;
  onLinkClick?: () => void;
}) {
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-transparent [&_img]:!border-0 [&_img]:!shadow-none [&_img]:!outline-none [&_img]:!ring-0">
            <Image src="/logo.png" alt="Fuente Palmera" width={40} height={40} className="size-full object-contain object-center mix-blend-multiply" unoptimized />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Admin</span>
            <span className="text-sm font-semibold text-stone-900">Fuente Palmera</span>
          </div>
        </div>
      </div>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Modo Administrador
      </div>
      <Link
        href="/panel"
        onClick={onLinkClick}
        className="mb-4 inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
      >
        ← Panel usuario (reservas, monedero)
      </Link>
      <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
        <p className="text-xs font-semibold text-stone-500">Conectado como</p>
        <p className="mt-1 text-sm font-bold text-stone-900">{displayName}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 text-sm">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            className="flex min-h-[44px] min-w-[44px] items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <span>{label}</span>
            <span className="text-xs text-stone-400">›</span>
          </Link>
        ))}
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
    <div className="flex max-h-dvh max-md:h-dvh flex-col bg-stone-100 text-stone-900 md:max-h-none md:min-h-screen">
      {/* Barra superior fija en móvil: no hace scroll, sensación estática */}
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

      {/* Backdrop móvil */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setMobileOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!mobileOpen}
      />

      {/* Sidebar móvil: overlay */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[280px] max-w-[85vw] overflow-y-auto border-r border-stone-200 bg-white p-5 shadow-xl transition-transform duration-300 ease-out md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!mobileOpen}
      >
        <SidebarContent displayName={displayName} onLinkClick={() => setMobileOpen(false)} />
      </aside>

      {/* Área que hace scroll: solo el contenido en móvil; en desktop todo el flex es normal */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain md:overflow-visible md:overscroll-none" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-4 md:flex-row md:px-6 md:py-6 lg:px-8">
          {/* Sidebar desktop: oculto en móvil */}
          <aside className="hidden w-64 flex-shrink-0 flex-col rounded-3xl border border-stone-200 bg-white p-5 shadow-lg shadow-stone-200/80 md:flex">
            <SidebarContent displayName={displayName} />
          </aside>

          {/* Contenido principal */}
          <main className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white p-4 shadow-lg shadow-stone-200/80 md:p-8 lg:p-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
