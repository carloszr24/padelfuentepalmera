'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  blockId: string;
  label?: string;
};

export function AdminDeleteBlockButton({ blockId, label = 'Eliminar' }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este bloque? La pista volverá a aceptar reservas en esa franja.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/court-schedules?id=${encodeURIComponent(blockId)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message ?? 'Error al eliminar');
        return;
      }
      router.refresh();
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
    >
      {loading ? '…' : label}
    </button>
  );
}
