import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCachedAuth } from '@/lib/auth-server';
import { LogoutButton } from '@/components/ui/logout-button';
import { PanelMobileNav } from '@/components/ui/panel-mobile-nav';

type PanelLayoutProps = {
  children: ReactNode;
};

export default async function PanelLayout({ children }: PanelLayoutProps) {
  const { user, profile } = await getCachedAuth();

  if (!user) {
    redirect('/login');
  }

  // Si Supabase tiene confirmación de email activada, no permitir acceso hasta verificar.
  const emailConfirmed = (user as { email_confirmed_at?: string | null }).email_confirmed_at;
  if (!emailConfirmed) {
    redirect('/login');
  }

  const isAdmin = profile?.role === 'admin';

  const displayName =
    profile?.full_name ||
    (user.user_metadata?.full_name as string) ||
    user.email?.split('@')[0] ||
    'Jugador';
  const balance = profile?.wallet_balance ?? 0;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 md:px-6 lg:px-8">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-shrink-0 flex-col rounded-3xl border border-stone-200 bg-white p-5 shadow-lg shadow-stone-200/80 md:flex">
          <Link href="/" className="mb-6 flex items-center gap-3 transition hover:opacity-90 outline-none">
            <div className="flex h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-transparent [&_img]:!border-0 [&_img]:!shadow-none [&_img]:!outline-none [&_img]:!ring-0">
              <Image src="/logo.png" alt="Fuente Palmera" width={40} height={40} className="size-full rounded-full object-contain object-center" unoptimized />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Panel usuario
              </span>
              <span className="text-sm font-semibold text-stone-900">Fuente Palmera</span>
            </div>
          </Link>
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            ← Volver a la web
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="mb-4 inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Panel administrador
            </Link>
          )}

          <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
            <p className="text-xs font-semibold text-stone-500">Bienvenido/a</p>
            <p className="mt-1 font-bold text-stone-900">{displayName}</p>
            <p className="mt-2 text-xs text-stone-600">
              {balance < 0 ? (
                <>
                  Deuda: <span className="font-bold text-amber-700">{Math.abs(Number(balance)).toFixed(2)} €</span>
                  <span className="mt-1 block text-amber-700">Recarga para poder reservar</span>
                </>
              ) : (
                <>Saldo: <span className="font-bold text-stone-900">{Number(balance).toFixed(2)} €</span></>
              )}
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-1 text-sm">
            <PanelNavLink href="/panel" label="Inicio" />
            <PanelNavLink href="/panel/reservas" label="Reservas" />
            <PanelNavLink href="/panel/monedero" label="Monedero" />
          </nav>

          <div className="mt-6 border-t border-stone-200 pt-4">
            <LogoutButton />
          </div>
        </aside>

        {/* Contenido principal — padding abajo en móvil para la barra inferior */}
        <main className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white p-4 shadow-lg shadow-stone-200/80 pb-24 md:pb-8 md:p-8 lg:p-10">
          <div className="mb-4 flex flex-col gap-3 md:hidden">
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
              >
                ← Web
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700"
                >
                  Admin
                </Link>
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
              <p className="truncate text-sm font-bold text-stone-900 pr-2">{displayName}</p>
              <p className="shrink-0 text-sm font-bold tabular-nums text-stone-900">
                {Number(balance).toFixed(2)} €
              </p>
            </div>
          </div>
          {children}
        </main>
      </div>

      <PanelMobileNav />
    </div>
  );
}

function PanelNavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
    >
      <span>{label}</span>
      <span className="text-xs text-stone-400">›</span>
    </Link>
  );
}
