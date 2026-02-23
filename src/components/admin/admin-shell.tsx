'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  BarChart3,
  LayoutGrid,
  Clock,
  Wallet,
  ArrowLeftRight,
  DollarSign,
  type LucideIcon,
} from 'lucide-react';
import { LogoutButton } from '@/components/ui/logout-button';

const NAV_LINKS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/usuarios', label: 'Usuarios', Icon: Users },
  { href: '/admin/socios', label: 'Socios', Icon: UserCheck },
  { href: '/admin/reservas', label: 'Reservas', Icon: Calendar },
  { href: '/admin/estadisticas', label: 'Estadísticas', Icon: BarChart3 },
  { href: '/admin/pistas', label: 'Pistas', Icon: LayoutGrid },
  { href: '/admin/horarios', label: 'Horarios', Icon: Clock },
  { href: '/admin/monederos', label: 'Monederos', Icon: Wallet },
  { href: '/admin/transacciones', label: 'Transacciones', Icon: ArrowLeftRight },
  { href: '/admin/finanzas', label: 'Finanzas', Icon: DollarSign },
];

type AdminShellProps = {
  displayName: string;
  children: React.ReactNode;
};

const SIDEBAR_BG = '#1a1a1a';
const SIDEBAR_TEXT = '#a3a3a3';

function AdminSidebarDesktop() {
  const pathname = usePathname();
  const router = useRouter();
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
        {NAV_LINKS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              onMouseEnter={() => router.prefetch(href)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-white/10 text-white' : 'hover:bg-white/[0.06] hover:text-white'
              }`}
              style={{ color: isActive ? 'white' : SIDEBAR_TEXT }}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'opacity-100' : 'opacity-80'}`} strokeWidth={2} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/[0.08] pt-4">
        <LogoutButton variant="adminSidebar" />
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
  const router = useRouter();

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
        prefetch={true}
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
        {NAV_LINKS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              onMouseEnter={() => router.prefetch(href)}
              onClick={onLinkClick}
              className={`flex min-h-[44px] min-w-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-white/10 text-white' : 'text-[var(--panel-sidebar-text)] hover:bg-white/[0.06] hover:text-white'
              }`}
              style={isActive ? undefined : { color: SIDEBAR_TEXT }}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={2} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/[0.08] pt-4">
        <LogoutButton variant="adminSidebar" />
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
            <div className="mb-6 flex flex-wrap items-center justify-end gap-2 border-b border-[#e8e8e4] pb-4">
              <Link
                href="/"
                className="rounded-lg border border-[#e8e8e4] bg-white px-4 py-2 text-[13px] font-medium text-[#404040] transition hover:border-[#d4d4d4] hover:bg-[#fafafa]"
              >
                ← Volver a la web
              </Link>
              <Link
                href="/panel"
                className="rounded-lg border border-[#e8e8e4] bg-white px-4 py-2 text-[13px] font-medium text-[#404040] transition hover:border-[#d4d4d4] hover:bg-[#fafafa]"
              >
                ← Panel cliente
              </Link>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
