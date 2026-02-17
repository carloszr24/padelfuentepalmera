'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Horario club: mañana 10-11:30, 11:30-13:00; tarde 16:30-18, 18-19:30, 19:30-21, 21-22:30
const SLOT_OPTIONS: { start: string; end: string; label: string }[] = [
  { start: '10:00', end: '11:30', label: '10:00 - 11:30' },
  { start: '11:30', end: '13:00', label: '11:30 - 13:00' },
  { start: '16:30', end: '18:00', label: '16:30 - 18:00' },
  { start: '18:00', end: '19:30', label: '18:00 - 19:30' },
  { start: '19:30', end: '21:00', label: '19:30 - 21:00' },
  { start: '21:00', end: '22:30', label: '21:00 - 22:30' },
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
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]"
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
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]"
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="slot" className="text-xs font-bold text-stone-600">Franja</label>
        <select
          id="slot"
          value={SLOT_OPTIONS.findIndex((s) => s.start === slot.start && s.end === slot.end)}
          onChange={(e) => setSlot(SLOT_OPTIONS[Number(e.target.value)])}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]"
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
          className="min-w-[160px] rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[#1d4ed8] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1e40af] disabled:opacity-60"
      >
        {loading ? 'Añadiendo…' : 'Bloquear franja'}
      </button>
      {error && (
        <p className="w-full text-sm font-medium text-red-600">{error}</p>
      )}
    </form>
  );
}
