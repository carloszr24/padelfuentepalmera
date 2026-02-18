'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function timeOptions(): string[] {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    opts.push(`${String(h).padStart(2, '0')}:00`);
    opts.push(`${String(h).padStart(2, '0')}:30`);
  }
  return opts;
}

const TIME_OPTS = timeOptions();

type WeeklyRow = {
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
};

const DEFAULT_WEEKLY: WeeklyRow[] = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
  day_of_week: d,
  is_open: true,
  open_time: d <= 5 ? '09:00' : '10:00',
  close_time: d <= 5 ? '22:00' : '21:00',
}));

type ExceptionRow = {
  id: string;
  exception_date: string;
  end_date: string | null;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  label: string | null;
};

type HorariosContentProps = {
  initialWeekly?: WeeklyRow[];
  initialExceptions?: ExceptionRow[];
};

export function HorariosContent({ initialWeekly, initialExceptions }: HorariosContentProps) {
  const router = useRouter();
  const [weekly, setWeekly] = useState<WeeklyRow[]>(initialWeekly ?? DEFAULT_WEEKLY);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>(initialExceptions ?? []);
  const [loading, setLoading] = useState(initialWeekly === undefined);
  const [saving, setSaving] = useState(false);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({
    exception_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    is_open: false,
    open_time: '09:00',
    close_time: '14:00',
    label: '',
  });
  const [savingException, setSavingException] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleRes, exceptionsRes] = await Promise.all([
        fetch('/api/admin/schedule'),
        fetch('/api/admin/schedule/exceptions'),
      ]);
      if (!scheduleRes.ok || !exceptionsRes.ok) {
        setError('Error al cargar horarios');
        return;
      }
      const scheduleData = await scheduleRes.json();
      const exceptionsData = await exceptionsRes.json();
      const w = scheduleData.weekly ?? [];
      if (w.length === 7) {
        setWeekly(
          w.map((r: WeeklyRow) => ({
            day_of_week: r.day_of_week,
            is_open: r.is_open,
            open_time: r.open_time ? String(r.open_time).slice(0, 5) : null,
            close_time: r.close_time ? String(r.close_time).slice(0, 5) : null,
          }))
        );
      }
      setExceptions(exceptionsData.exceptions ?? []);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialWeekly !== undefined) return;
    load();
  }, [initialWeekly, load]);

  const handleSaveWeekly = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekly: weekly.map((r) => ({
            day_of_week: r.day_of_week,
            is_open: r.is_open,
            open_time: r.is_open ? r.open_time ?? '09:00' : undefined,
            close_time: r.is_open ? r.close_time ?? '22:00' : undefined,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message ?? 'Error al guardar');
        return;
      }
      router.refresh();
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (dayOfWeek: number, patch: Partial<WeeklyRow>) => {
    setWeekly((prev) =>
      prev.map((r) => (r.day_of_week === dayOfWeek ? { ...r, ...patch } : r))
    );
  };

  const addException = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingException(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/schedule/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exception_date: exceptionForm.exception_date,
          end_date: exceptionForm.end_date || undefined,
          is_open: exceptionForm.is_open,
          open_time: exceptionForm.is_open ? exceptionForm.open_time : undefined,
          close_time: exceptionForm.is_open ? exceptionForm.close_time : undefined,
          label: exceptionForm.label || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message ?? 'Error al añadir');
        return;
      }
      setExceptionModalOpen(false);
      setExceptionForm({
        exception_date: new Date().toISOString().slice(0, 10),
        end_date: '',
        is_open: false,
        open_time: '09:00',
        close_time: '14:00',
        label: '',
      });
      load();
      router.refresh();
    } catch {
      setError('Error de conexión');
    } finally {
      setSavingException(false);
    }
  };

  const deleteException = async (id: string) => {
    if (!confirm('¿Eliminar esta excepción?')) return;
    try {
      const res = await fetch(`/api/admin/schedule/exceptions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setExceptions((prev) => prev.filter((e) => e.id !== id));
        router.refresh();
      }
    } catch {
      setError('Error al eliminar');
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center text-sm text-stone-500">
        Cargando horarios…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Horario semanal */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-600">
          Horario semanal por defecto
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs font-bold uppercase text-stone-500">
                <th className="pb-2 pr-4">Día</th>
                <th className="pb-2 pr-4">Cerrado</th>
                <th className="pb-2 pr-4">Apertura</th>
                <th className="pb-2">Cierre</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((row) => (
                <tr key={row.day_of_week} className="border-b border-stone-100">
                  <td className="py-3 pr-4 font-medium text-stone-900">
                    {DAY_NAMES[row.day_of_week - 1]}
                  </td>
                  <td className="py-3 pr-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!row.is_open}
                        onChange={(e) =>
                          updateDay(row.day_of_week, { is_open: !e.target.checked })
                        }
                        className="h-4 w-4 rounded border-stone-300"
                      />
                      <span className="text-xs text-stone-600">Cerrado</span>
                    </label>
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={row.open_time ?? '09:00'}
                      disabled={!row.is_open}
                      onChange={(e) => updateDay(row.day_of_week, { open_time: e.target.value })}
                      className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-stone-900 disabled:bg-stone-100 disabled:text-stone-400"
                    >
                      {TIME_OPTS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3">
                    <select
                      value={row.close_time ?? '22:00'}
                      disabled={!row.is_open}
                      onChange={(e) => updateDay(row.day_of_week, { close_time: e.target.value })}
                      className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-stone-900 disabled:bg-stone-100 disabled:text-stone-400"
                    >
                      {TIME_OPTS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={handleSaveWeekly}
            disabled={saving}
            className="rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1e40af] disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar horarios'}
          </button>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
      </div>

      {/* Días especiales */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-600">
          Días especiales
        </h2>
        <p className="mb-4 text-xs text-stone-500">
          Excepciones para fechas concretas (festivos, horario reducido, etc.).
        </p>
        <button
          type="button"
          onClick={() => setExceptionModalOpen(true)}
          className="mb-4 rounded-xl border border-[#1d4ed8]/50 bg-[#1d4ed8]/10 px-4 py-2 text-sm font-bold text-[#1d4ed8] transition hover:bg-[#1d4ed8]/20"
        >
          Añadir excepción
        </button>
        <ul className="space-y-2">
          {exceptions.length === 0 ? (
            <li className="py-4 text-center text-sm text-stone-500">
              No hay excepciones. Añade una para un festivo o horario especial.
            </li>
          ) : (
            exceptions.map((ex) => (
              <li
                key={ex.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3"
              >
                <div>
                  <span className="font-medium text-stone-900">
                    {ex.exception_date}
                    {ex.end_date && ex.end_date !== ex.exception_date
                      ? ` – ${ex.end_date}`
                      : ''}
                  </span>
                  {ex.label && (
                    <span className="ml-2 text-stone-500">({ex.label})</span>
                  )}
                  <span className="ml-2 text-stone-600">
                    {ex.is_open
                      ? ` ${String(ex.open_time).slice(0, 5)} – ${String(ex.close_time).slice(0, 5)}`
                      : ' Cerrado'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => deleteException(ex.id)}
                  className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                >
                  Eliminar
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Modal añadir excepción */}
      {exceptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-stone-900">Añadir excepción</h3>
            <form onSubmit={addException} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-600">Fecha inicio</label>
                <input
                  type="date"
                  value={exceptionForm.exception_date}
                  onChange={(e) =>
                    setExceptionForm((f) => ({ ...f, exception_date: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-600">
                  Fecha fin (opcional, para rango)
                </label>
                <input
                  type="date"
                  value={exceptionForm.end_date}
                  onChange={(e) =>
                    setExceptionForm((f) => ({ ...f, end_date: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={exceptionForm.is_open}
                    onChange={(e) =>
                      setExceptionForm((f) => ({ ...f, is_open: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-stone-300"
                  />
                  <span className="text-sm font-medium text-stone-700">Abierto (horario reducido)</span>
                </label>
              </div>
              {exceptionForm.is_open && (
                <div className="flex gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-stone-600">Apertura</label>
                    <select
                      value={exceptionForm.open_time}
                      onChange={(e) =>
                        setExceptionForm((f) => ({ ...f, open_time: e.target.value }))
                      }
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
                    >
                      {TIME_OPTS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-stone-600">Cierre</label>
                    <select
                      value={exceptionForm.close_time}
                      onChange={(e) =>
                        setExceptionForm((f) => ({ ...f, close_time: e.target.value }))
                      }
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
                    >
                      {TIME_OPTS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-600">
                  Etiqueta (opcional)
                </label>
                <input
                  type="text"
                  value={exceptionForm.label}
                  onChange={(e) =>
                    setExceptionForm((f) => ({ ...f, label: e.target.value }))
                  }
                  placeholder="Navidad, Feria…"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 placeholder:text-stone-400"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExceptionModalOpen(false)}
                  className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingException}
                  className="rounded-xl bg-[#1d4ed8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1e40af] disabled:opacity-60"
                >
                  {savingException ? 'Añadiendo…' : 'Añadir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
