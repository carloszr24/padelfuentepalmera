'use client';

import Link from 'next/link';
import { usePanelUser } from '@/contexts/panel-user-context';
import { LogoutButton } from '@/components/ui/logout-button';

export function PanelPerfilClient() {
  const { displayName, balance, profile, isAdmin } = usePanelUser();

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-stone-900">Perfil</h1>
        <p className="text-sm text-stone-600">Tu cuenta y opciones</p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Datos</p>
        <p className="mt-2 font-bold text-stone-900">{displayName}</p>
        {profile?.full_name && (
          <p className="mt-1 text-sm text-stone-600">Nombre: {profile.full_name}</p>
        )}
        <p className="mt-1 text-sm text-stone-600">Saldo actual: <span className="font-semibold tabular-nums">{Number(balance).toFixed(2)} €</span></p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/panel"
          className="min-h-[44px] flex items-center justify-center rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
          prefetch
        >
          ← Volver al inicio
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
            prefetch
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Panel administrador
          </Link>
        )}

        <LogoutButton />
      </div>
    </div>
  );
}
