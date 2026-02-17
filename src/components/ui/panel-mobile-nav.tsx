'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/panel', label: 'Inicio', icon: '⌂' },
  { href: '/panel/reservas', label: 'Reservas', icon: '📅' },
  { href: '/panel/monedero', label: 'Monedero', icon: '💰' },
] as const;

export function PanelMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Navegación principal"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== '/panel' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2.5 text-center transition ${
                isActive
                  ? 'bg-[#1d4ed8]/10 text-[#1d4ed8]'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>{icon}</span>
              <span className="text-[11px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
