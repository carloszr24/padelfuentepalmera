'use client';

import Link from 'next/link';
import { LogoutButton } from '@/components/ui/logout-button';
import { usePanelUser } from '@/contexts/panel-user-context';

export function PanelPerfilClient() {
  const { displayName, balance, profile, isAdmin } = usePanelUser();

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div>
        <h1 className="font-bold tracking-tight text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '24px' }}>
          Perfil
        </h1>
        <p className="mt-0.5 text-[13px] text-[var(--panel-text-secondary)]">Tu cuenta y opciones</p>
      </div>

      <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-card)] p-6 shadow-[var(--panel-shadow-sm)]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--panel-text-secondary)]">Datos</p>
        <p className="mt-2 font-bold text-[var(--panel-text)]">{displayName}</p>
        {profile?.full_name && (
          <p className="mt-1 text-sm text-[var(--panel-text-secondary)]">Nombre: {profile.full_name}</p>
        )}
        <p className="mt-1 text-sm text-[var(--panel-text-secondary)]">
          Saldo actual: <span className="font-semibold tabular-nums text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>{Number(balance).toFixed(2).replace('.', ',')} €</span>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/panel"
          className="flex min-h-[44px] items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--panel-text)] transition hover:bg-[var(--panel-bg)]"
          prefetch
        >
          ← Volver al inicio
        </Link>
        <Link
          href="/"
          className="flex min-h-[44px] items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--panel-text)] transition hover:bg-[var(--panel-bg)]"
          prefetch
        >
          Volver a la web
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--panel-radius)] border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
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
