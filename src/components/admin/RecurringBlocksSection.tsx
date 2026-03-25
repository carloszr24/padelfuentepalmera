'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SLOT_OPTIONS = ['09:30', '11:00', '12:30', '16:30', '18:00', '19:30', '21:00'];

type Block = {
  id: string;
  court_id: string;
  court_name: string;
  day_of_week: number;
  start_time: string;
  reason: string | null;
};

type Court = { id: string; name: string };

export function RecurringBlocksSection() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    court_id: '',
    day_of_week: 1,
    start_time: '18:00',
    reason: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/recurring-blocks');
      if (!res.ok) {
        setBlocks([]);
        setCourts([]);
        return;
      }
      const data = await res.json();
      setBlocks(data.blocks ?? []);
      setCourts(data.courts ?? []);
    } catch {
      setBlocks([]);
      setCourts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.court_id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/recurring-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court_id: form.court_id,
          day_of_week: form.day_of_week,
          start_time: form.start_time,
          reason: form.reason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message ?? 'Error al guardar');
        return;
      }
      setModalOpen(false);
      setForm({ court_id: courts[0]?.id ?? '', day_of_week: 1, start_time: '18:00', reason: '' });
      load();
      router.refresh();
    } catch {
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este bloqueo permanente?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/recurring-blocks?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setBlocks((prev) => prev.filter((b) => b.id !== id));
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message ?? 'Error al eliminar');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[10px] bg-[#f7f7f5] p-5">
        <h2 className="admin-stat-label mb-4">Bloqueos permanentes</h2>
        <p className="py-4 text-center text-sm text-[#6b6b6b]">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-[#f7f7f5] p-5">
      <h2 className="admin-stat-label mb-4">Bloqueos permanentes</h2>
      <p className="mb-4 text-[13px] text-[#6b6b6b]">
        Franjas recurrentes cada semana que no aparecen como disponibles para los usuarios.
      </p>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="admin-btn mb-4 rounded-lg border border-[#1d4ed8]/50 bg-[#1d4ed8]/10 font-semibold text-[#1d4ed8] transition hover:bg-[#1d4ed8]/20"
      >
        Nuevo bloqueo
      </button>

      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[400px] text-left text-sm">
          <thead>
            <tr>
              <th>Pista</th>
              <th>Día</th>
              <th>Hora</th>
              <th>Motivo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {blocks.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[#6b6b6b]">
                  No hay bloqueos permanentes.
                </td>
              </tr>
            ) : (
              blocks.map((b) => (
                <tr key={b.id} className="border-b border-[#e8e8e4]">
                  <td className="font-medium text-[#1a1a1a]">{b.court_name}</td>
                  <td>{DAY_NAMES[b.day_of_week - 1]}</td>
                  <td>{b.start_time}</td>
                  <td className="text-[#6b6b6b]">{b.reason ?? '—'}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleDelete(b.id)}
                      disabled={deletingId === b.id}
                      className="admin-btn rounded-lg border border-red-200 bg-red-50 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      {deletingId === b.id ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[10px] border border-[#e8e8e4] bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-stone-900">Nuevo bloqueo</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-600">Pista</label>
                <select
                  value={form.court_id}
                  onChange={(e) => setForm((f) => ({ ...f, court_id: e.target.value }))}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
                  required
                >
                  <option value="">Selecciona pista</option>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-600">Día</label>
                <select
                  value={form.day_of_week}
                  onChange={(e) => setForm((f) => ({ ...f, day_of_week: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
                >
                  {DAY_NAMES.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-600">Hora</label>
                <select
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
                >
                  {SLOT_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-600">Motivo (opcional)</label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Clases del club, Mantenimiento…"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 placeholder:text-stone-400"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.court_id}
                  className="rounded-xl bg-[#1d4ed8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1e40af] disabled:opacity-60"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
