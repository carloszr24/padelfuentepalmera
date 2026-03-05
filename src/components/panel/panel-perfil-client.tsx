'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogoutButton } from '@/components/ui/logout-button';
import { usePanelUser } from '@/contexts/panel-user-context';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export function PanelPerfilClient() {
  const { displayName, balance, profile, isAdmin } = usePanelUser();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const router = useRouter();

  const handleDeleteAccount = async () => {
    setDeletePending(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message ?? 'Error al eliminar la cuenta');
        setDeletePending(false);
        return;
      }
      setDeleteModalOpen(false);
      await getBrowserSupabaseClient().auth.signOut();
      router.push('/');
      router.refresh();
    } catch {
      alert('Error de conexión');
      setDeletePending(false);
    }
  };

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
        <LogoutButton variant="profile" />
        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="flex min-h-[44px] items-center justify-center rounded-[var(--panel-radius)] border border-red-700/30 bg-[#dc2626] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
        >
          Eliminar mi cuenta
        </button>
      </div>

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="w-full max-w-sm rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-card)] p-6 shadow-lg">
            <h2 id="delete-modal-title" className="font-bold text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '18px' }}>
              ¿Eliminar mi cuenta?
            </h2>
            <p className="mt-2 text-sm text-[var(--panel-text-secondary)]">
              Se borrarán tus datos y no podrás acceder de nuevo. Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => !deletePending && setDeleteModalOpen(false)}
                disabled={deletePending}
                className="flex-1 rounded-[10px] border border-[var(--panel-border)] bg-white py-2.5 text-sm font-semibold text-[var(--panel-text)] transition hover:bg-[var(--panel-bg)] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletePending}
                className="flex-1 rounded-[10px] bg-[#dc2626] py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {deletePending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
