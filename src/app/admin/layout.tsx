import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCachedAuth } from '@/lib/auth-server';
import { LogoutButton } from '@/components/ui/logout-button';

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const { user, profile } = await getCachedAuth();

  if (!user) {
    redirect('/login');
  }

  if (profile?.role !== 'admin') {
    redirect('/panel');
  }

  const displayName = profile?.full_name || 'Administrador';

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 md:px-6 lg:px-8">
        {/* Sidebar admin */}
        <aside className="w-64 flex-shrink-0 rounded-3xl border border-stone-200 bg-white p-5 shadow-lg shadow-stone-200/80">
          <div className="mb-6 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-stone-100 shadow-md shadow-stone-200">
                <Image src="/logo.png" alt="Fuente Palmera" width={40} height={40} className="size-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  Admin
                </span>
                <span className="text-sm font-semibold text-stone-900">
                  Fuente Palmera
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Modo Administrador
          </div>

          <Link
            href="/panel"
            className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            ← Panel usuario (reservas, monedero)
          </Link>

          <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
            <p className="text-xs font-semibold text-stone-500">Conectado como</p>
            <p className="mt-1 text-sm font-bold text-stone-900">
              {displayName}
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-1 text-sm">
            <AdminNavLink href="/admin" label="Dashboard" />
            <AdminNavLink href="/admin/usuarios" label="Usuarios" />
            <AdminNavLink href="/admin/reservas" label="Reservas" />
            <AdminNavLink href="/admin/pistas" label="Pistas" />
            <AdminNavLink href="/admin/monederos" label="Monederos" />
            <AdminNavLink href="/admin/transacciones" label="Transacciones" />
          </nav>

          <div className="mt-6 border-t border-stone-200 pt-4">
            <LogoutButton />
          </div>
        </aside>

        {/* Contenido principal */}
        <main className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/80 md:p-8 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}

type AdminNavLinkProps = {
  href: string;
  label: string;
};

function AdminNavLink({ href, label }: AdminNavLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
    >
      <span>{label}</span>
      <span className="text-xs text-stone-400">›</span>
    </Link>
  );
}

