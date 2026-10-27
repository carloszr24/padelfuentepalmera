'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconHome, IconCalendar, IconWallet, IconUser } from '@/components/ui/panel-nav-icons';

const NAV_ITEMS = [
  { href: '/panel', label: 'Inicio', Icon: IconHome },
  { href: '/panel/reservas', label: 'Reservas', Icon: IconCalendar },
  { href: '/panel/monedero', label: 'Monedero', Icon: IconWallet },
  { href: '/panel/perfil', label: 'Perfil', Icon: IconUser },
] as const;

export function PanelMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-[var(--panel-border)] pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      aria-label="Navegación principal"
    >
      <div className="mx-auto flex w-full max-w-lg items-start justify-around px-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/panel' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={`flex flex-col items-center gap-1 text-[10px] font-semibold tracking-wide transition-colors ${
                isActive ? 'text-[var(--panel-accent)]' : 'text-[var(--panel-text-secondary)]'
              }`}
            >
              <Icon className="h-6 w-6 shrink-0" />
              <span>{label}</span>
              <div
                className={`mt-0.5 h-1 w-1 rounded-full bg-[var(--panel-accent)] transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
