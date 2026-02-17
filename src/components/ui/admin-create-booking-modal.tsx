'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

function slotEnd(start: string): string {
  const [h, m] = start.split(':').map(Number);
  let endM = m + 30;
  let endH = h + 1;
  if (endM >= 60) {
    endM -= 60;
    endH += 1;
  }
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function buildDateStrip(count: number): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = [];
  const today = new Date();
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    out.push({ date: dateStr, label: `${dayNames[d.getDay()]} ${d.getDate()}` });
  }
  return out;
}

type Court = { id: string; name: string };
type User = { id: string; full_name: string | null; email: string | null };

type AdminCreateBookingModalProps = {
  open: boolean;
  onClose: () => void;
  courts: Court[];
  users: User[];
};

export function AdminCreateBookingModal({
  open,
  onClose,
  courts,
  users,
}: AdminCreateBookingModalProps) {
  const [step, setStep] = useState<'choose' | 'slot' | 'done'>('choose');
  const [userId, setUserId] = useState('');
  const [courtId, setCourtId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const dateStrip = useMemo(() => buildDateStrip(21), []);
  const userName = users.find((u) => u.id === userId)?.full_name || users.find((u) => u.id === userId)?.email || '—';
  const courtName = courts.find((c) => c.id === courtId)?.name ?? '—';

  useEffect(() => {
    if (!open) {
      setStep('choose');
      setUserId('');
      setCourtId('');
      setDate(new Date().toISOString().slice(0, 10));
      setSlots([]);
      setSelectedSlot('');
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !courtId || !date) return;
    setLoadingSlots(true);
    fetch(`/api/bookings/availability?courtId=${encodeURIComponent(courtId)}&date=${encodeURIComponent(date)}`)
      .then((r) => r.json())
      .then((data) => setSlots(data?.available ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [open, courtId, date]);

  const canShowSlots = userId && courtId && date;
  const goToSlots = () => {
    setError(null);
    setSelectedSlot('');
    setStep('slot');
  };

  const handleCreate = async () => {
    if (!selectedSlot || !userId || !courtId || !date) return;
    setLoading(true);
    setError(null);
    const endTime = slotEnd(selectedSlot);
    try {
      const res = await fetch('/api/admin/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          courtId,
          bookingDate: date,
          startTime: selectedSlot,
          endTime,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'Error al crear la reserva');
        setLoading(false);
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[calc(100vw-32px)] max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900">Crear reserva (admin, sin depósito)</h2>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900">
            <span className="sr-only">Cerrar</span>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {step === 'choose' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-600">Cliente</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#1d4ed8] focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]">
                <option value="">Selecciona usuario</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email || u.id.slice(0, 8)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-stone-600">Pista</label>
              <select value={courtId} onChange={(e) => setCourtId(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-[#1d4ed8] focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]">
                <option value="">Selecciona pista</option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-stone-600">Fecha</label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {dateStrip.map(({ date: d, label }) => (
                  <button key={d} type="button" onClick={() => setDate(d)} className={`flex-shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition ${date === d ? 'border-[#1d4ed8] bg-[#1d4ed8]/15 text-[#1d4ed8]' : 'border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            <div className="flex flex-col gap-3 pt-2 md:flex-row md:justify-end md:gap-4">
              <button type="button" onClick={onClose} className="min-h-[44px] w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100 md:w-auto">Cancelar</button>
              <button type="button" onClick={goToSlots} disabled={!canShowSlots || loadingSlots} className="min-h-[44px] w-full rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-50 md:w-auto">Elegir hora</button>
            </div>
          </div>
        )}

        {step === 'slot' && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-stone-700">{courtName} · {new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })} · {userName}</p>
            {loadingSlots ? (
              <p className="text-sm font-medium text-stone-600">Cargando horarios...</p>
            ) : slots.length === 0 ? (
              <p className="text-sm font-semibold text-amber-600">No hay huecos libres ese día.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button key={slot} type="button" onClick={() => setSelectedSlot(slot)} className={`min-h-[44px] rounded-xl border py-2 text-sm font-bold transition ${selectedSlot === slot ? 'border-[#1d4ed8] bg-[#1d4ed8]/15 text-[#1d4ed8]' : 'border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}>
                    {slot}
                  </button>
                ))}
              </div>
            )}
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            <div className="flex flex-col gap-3 pt-2 md:flex-row md:justify-end md:gap-4">
              <button type="button" onClick={() => setStep('choose')} className="min-h-[44px] w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100 md:w-auto">Atrás</button>
              <button type="button" onClick={handleCreate} disabled={!selectedSlot || loading} className="min-h-[44px] w-full rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-50 md:w-auto">
                {loading ? 'Creando...' : `Crear reserva ${selectedSlot}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
