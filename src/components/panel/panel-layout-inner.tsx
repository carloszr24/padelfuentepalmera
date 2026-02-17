'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/ui/logout-button';
import { usePanelUser } from '@/contexts/panel-user-context';

function PanelNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      prefetch={true}
      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
    >
      <span>{label}</span>
      <span className="text-xs text-stone-400">›</span>
    </Link>
  );
}

export function PanelLayoutInner({ children }: { children: ReactNode }) {
  const { displayName, balance, isAdmin } = usePanelUser();

  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden overflow-y-auto bg-stone-100 text-stone-900 overscroll-behavior-y-contain">
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl gap-6 overflow-x-hidden px-4 py-6 md:px-6 lg:px-8">
        <aside className="hidden w-64 flex-shrink-0 flex-col rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:flex">
          <Link href="/" className="mb-6 flex items-center gap-3 transition hover:opacity-90 outline-none" prefetch={true}>
            <div className="flex h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-transparent [&_img]:!border-0 [&_img]:!shadow-none [&_img]:!outline-none [&_img]:!ring-0">
              <Image
                src="/logo-transparent.png"
                alt="Fuente Palmera"
                width={40}
                height={40}
                className="size-full rounded-full border-0 object-contain object-center outline-none ring-0 mix-blend-darken [&_img]:border-0 [&_img]:outline-none [&_img]:ring-0"
                unoptimized
              />
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
            prefetch={true}
          >
            ← Volver a la web
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="mb-4 inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
              prefetch={true}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Panel administrador
            </Link>
          )}

          <div className="mb-6 max-w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm">
            <p className="text-xs font-semibold text-stone-500">Bienvenido/a</p>
            <p className="mt-1 truncate font-bold text-stone-900">{displayName}</p>
            <p className="mt-2 text-xs text-stone-600">
              {balance < 0 ? (
                <>
                  Deuda: <span className="whitespace-nowrap font-bold text-amber-700">{Math.abs(Number(balance)).toFixed(2)} €</span>
                  <span className="mt-1 block text-amber-700">Recarga para poder reservar</span>
                </>
              ) : (
                <>Saldo: <span className="whitespace-nowrap font-bold text-stone-900">{Number(balance).toFixed(2)} €</span></>
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

        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm pb-24 md:pb-8 md:p-8 lg:p-10 max-w-full box-border">
          <div className="mb-4 flex flex-col gap-3 md:hidden">
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
                prefetch={true}
              >
                ← Web
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700"
                  prefetch={true}
                >
                  Admin
                </Link>
              )}
            </div>
            <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-stone-50 px-4 py-3">
              <p className="min-w-0 truncate text-sm font-bold text-stone-900">{displayName}</p>
              <p className="shrink-0 text-sm font-bold tabular-nums whitespace-nowrap text-stone-900">
                {Number(balance).toFixed(2)} €
              </p>
            </div>
          </div>
          <div className="min-w-0 max-w-full overflow-x-hidden">{children}</div>
        </main>
      </div>
    </div>
  );
}
