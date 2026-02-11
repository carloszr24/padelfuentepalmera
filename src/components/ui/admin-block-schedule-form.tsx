'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SLOT_OPTIONS: { start: string; end: string; label: string }[] = [
  { start: '09:00', end: '10:30', label: '09:00 - 10:30' },
  { start: '10:30', end: '12:00', label: '10:30 - 12:00' },
  { start: '12:00', end: '13:30', label: '12:00 - 13:30' },
  { start: '13:30', end: '15:00', label: '13:30 - 15:00' },
  { start: '15:00', end: '16:30', label: '15:00 - 16:30' },
  { start: '16:30', end: '18:00', label: '16:30 - 18:00' },
  { start: '18:00', end: '19:30', label: '18:00 - 19:30' },
  { start: '19:30', end: '21:00', label: '19:30 - 21:00' },
  { start: '20:00', end: '21:30', label: '20:00 - 21:30' },
];

type Court = { id: string; name: string };

type Props = {
  courts: Court[];
};

export function AdminBlockScheduleForm({ courts }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courtId, setCourtId] = useState('');
  const [blockedDate, setBlockedDate] = useState('');
  const [slot, setSlot] = useState(SLOT_OPTIONS[0]);
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!courtId || !blockedDate) {
      setError('Elige pista y fecha.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/court-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId,
          blockedDate,
          startTime: slot.start,
          endTime: slot.end,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? 'Error al crear el bloque');
        return;
      }
      setCourtId('');
      setBlockedDate('');
      setSlot(SLOT_OPTIONS[0]);
      setReason('');
      router.refresh();
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="court" className="text-xs font-bold text-stone-600">Pista</label>
        <select
          id="court"
          value={courtId}
          onChange={(e) => setCourtId(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-[#B5235D] focus:ring-1 focus:ring-[#B5235D]"
          required
        >
          <option value="">— Elegir —</option>
          {courts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="date" className="text-xs font-bold text-stone-600">Fecha</label>
        <input
          id="date"
          type="date"
          value={blockedDate}
          onChange={(e) => setBlockedDate(e.target.value)}
          min={today}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-[#B5235D] focus:ring-1 focus:ring-[#B5235D]"
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="slot" className="text-xs font-bold text-stone-600">Franja</label>
        <select
          id="slot"
          value={SLOT_OPTIONS.findIndex((s) => s.start === slot.start && s.end === slot.end)}
          onChange={(e) => setSlot(SLOT_OPTIONS[Number(e.target.value)])}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-[#B5235D] focus:ring-1 focus:ring-[#B5235D]"
        >
          {SLOT_OPTIONS.map((s, i) => (
            <option key={i} value={i}>{s.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="reason" className="text-xs font-bold text-stone-600">Motivo (opcional)</label>
        <input
          id="reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Mantenimiento, torneo…"
          className="min-w-[160px] rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#B5235D] focus:ring-1 focus:ring-[#B5235D]"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[#B5235D] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#9f1e50] disabled:opacity-60"
      >
        {loading ? 'Añadiendo…' : 'Bloquear franja'}
      </button>
      {error && (
        <p className="w-full text-sm font-medium text-red-600">{error}</p>
      )}
    </form>
  );
}
