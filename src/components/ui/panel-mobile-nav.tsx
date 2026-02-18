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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] pt-2 md:hidden"
      aria-label="Navegación principal"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/panel' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-center transition ${
                isActive ? 'text-blue-600' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Icon className="h-6 w-6 shrink-0" />
              <span className="text-[11px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
