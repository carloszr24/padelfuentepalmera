'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { SocioUpsell } from '@/components/ui/socio-upsell';
import { usePanelUserOptional } from '@/contexts/panel-user-context';

// Horario club: última reserva 21:00 (sesión hasta 22:30, cierre)
const SLOT_STARTS = ['10:00', '11:30', '16:30', '18:00', '19:30', '21:00'];

const ACCENT = '#1d4ed8'; // azul del club

function slotEnd(start: string): string {
  const [h, m] = start.split(':').map(Number);
  let endM = m + 30;
  let endH = h + 1;
  if (endM >= 60) {
    endM -= 60;
    endH += 1;
  }
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;
}

type Court = { id: string; name: string };

type BookingModalProps = {
  courts: Court[];
  triggerLabel?: string;
  triggerClassName?: string;
  onSuccess?: () => void;
};

function buildDateStrip(count: number): { date: string; label: string; dayShort: string }[] {
  const out: { date: string; label: string; dayShort: string }[] = [];
  const now = new Date();
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
    const fmt = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric' });
    const parts = fmt.formatToParts(d);
    const dayShort = parts.find((p) => p.type === 'weekday')?.value?.toUpperCase().slice(0, 3) ?? dayNames[d.getDay()];
    const num = parts.find((p) => p.type === 'day')?.value ?? String(d.getDate());
    const label = i === 0 ? `Hoy ${num}` : `${dayShort} ${num}`;
    out.push({ date: dateStr, label, dayShort });
  }
  return out;
}

export function BookingModal({ courts, triggerLabel = 'Nueva reserva', triggerClassName, onSuccess }: BookingModalProps) {
  const panelUser = usePanelUserOptional();
  const isMember = panelUser?.isMember ?? true; // si no hay contexto (admin) permitir
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'choose' | 'slots' | 'confirm'>('choose');
  const [courtId, setCourtId] = useState('');
  const [date, setDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [clubClosed, setClubClosed] = useState(false);
  const [clubClosedLabel, setClubClosedLabel] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const dateStrip = useMemo(() => buildDateStrip(14), []);

  const courtName = courts.find((c) => String(c.id) === String(courtId))?.name ?? '';
  const endTime = selectedSlot ? slotEnd(selectedSlot) : '';

  const now = new Date();
  const todayMadrid = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  const timeMadrid = now.toLocaleTimeString('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const isTodayMadrid = date === todayMadrid;
  const slotsToShow =
    isTodayMadrid ? availableSlots.filter((slot) => slot > timeMadrid) : availableSlots;
  const noSlotsMessage = clubClosed
    ? (clubClosedLabel ? `Club cerrado (${clubClosedLabel}).` : 'Club cerrado ese día.')
    : isTodayMadrid && slotsToShow.length === 0
      ? 'No quedan horas disponibles para hoy. Selecciona otro día.'
      : 'No hay huecos disponibles ese día. Elige otra fecha o pista.';

  useEffect(() => {
    if (!open) {
      setStep('choose');
      setCourtId('');
      setDate(new Date().toISOString().slice(0, 10));
      setAvailableSlots([]);
      setClubClosed(false);
      setClubClosedLabel(null);
      setSelectedSlot('');
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!courtId || !date || step !== 'choose') return;
    setLoadingSlots(true);
    setError(null);
    fetch(
      `/api/bookings/availability?courtId=${encodeURIComponent(courtId)}&date=${encodeURIComponent(date)}`
    )
      .then((r) => r.json())
      .then((data) => {
        setAvailableSlots(data?.available ?? []);
        setClubClosed(data?.closed === true);
        setClubClosedLabel(data?.label ?? null);
      })
      .catch(() => {
        setAvailableSlots([]);
        setClubClosed(false);
        setClubClosedLabel(null);
      })
      .finally(() => setLoadingSlots(false));
  }, [courtId, date, step]);

  const showSlots = () => {
    setError(null);
    setSelectedSlot('');
    setStep('slots');
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courtId || !date || !selectedSlot) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId,
          bookingDate: date,
          startTime: selectedSlot + ':00',
          endTime,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.code === 'INSUFFICIENT_BALANCE') {
          router.push('/panel/monedero');
          return;
        }
        setError(data?.message ?? 'Error al crear la reserva.');
        return;
      }
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? 'min-h-[44px] min-w-[44px] rounded-full bg-[#1d4ed8] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-[#1d4ed8]/30 transition hover:scale-[1.02] hover:bg-[#2563eb] active:scale-[0.98]'}
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm md:bg-black/40 md:backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className="flex w-full max-w-[calc(100vw-32px)] flex-col rounded-3xl border border-stone-200 bg-white shadow-2xl md:max-h-[80vh] md:max-w-[640px] md:overflow-hidden md:rounded-2xl md:shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative shrink-0 border-b border-stone-200 px-4 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-6">
              <span
                className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white"
                style={{ backgroundColor: ACCENT }}
              >
                Sistema de reservas
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                Reserva tu <span style={{ color: ACCENT }}>pista</span>
              </h2>
              <p className="mt-2 text-base font-medium text-stone-600">
                Elige tu horario, confirma con depósito de 4,50 € y prepárate para jugar al máximo nivel.
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 min-h-[44px] min-w-[44px] rounded-full p-2.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 sm:right-6 sm:top-6"
                aria-label="Cerrar"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">
              {!isMember && (
                <SocioUpsell
                  onCtaClick={() => { setOpen(false); window.location.href = '/panel/membresia'; }}
                  ctaLabel="Hazte socio para reservar"
                />
              )}
              {isMember && step === 'choose' && (
                <div className="space-y-8">
                  {courts.length === 0 ? (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-4 text-base font-semibold text-amber-800">
                      No hay pistas cargadas. Crea pistas en el panel de administración o recarga la página.
                    </p>
                  ) : (
                    <>
                      {/* Franja de fechas */}
                      <div>
                        <p className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500">
                          Fecha
                        </p>
                        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
                          {dateStrip.map((d) => (
                            <button
                              key={d.date}
                              type="button"
                              onClick={() => setDate(d.date)}
                              className={`flex min-w-[5.5rem] flex-shrink-0 flex-col items-center rounded-xl border px-4 py-3.5 text-center font-bold transition ${date === d.date ? 'border-[#1d4ed8] bg-[#1d4ed8]/15 text-[#1d4ed8]' : 'border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}
                            >
                              <span className="text-xs font-semibold">{d.dayShort}</span>
                              <span className="mt-1 text-xl font-bold">{d.date.slice(8, 10)}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Botones de pista: 3 columnas para que quepan en una fila en móvil */}
                      <div>
                        <p className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500">
                          Pista
                        </p>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          {courts.map((c) => (
                            <button
                              key={String(c.id)}
                              type="button"
                              onClick={() => setCourtId(String(c.id))}
                              className={`min-h-[44px] rounded-xl border px-3 py-3 text-sm font-bold transition sm:px-6 sm:text-base ${courtId === String(c.id) ? 'border-[#1d4ed8] bg-[#1d4ed8] text-white' : 'border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Horarios (preview o ir a ver slots) */}
                      <div className="-mt-1 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <p className="text-sm font-medium text-stone-600">
                          {courtId && date
                            ? loadingSlots
                              ? 'Buscando huecos...'
                              : `${availableSlots.length} huecos disponibles`
                            : 'Elige fecha y pista para ver horarios'}
                        </p>
                        <button
                          type="button"
                          onClick={showSlots}
                          disabled={!courtId || !date || loadingSlots}
                          className={`min-h-[44px] w-full rounded-xl px-6 py-3 text-base font-bold text-white transition disabled:opacity-50 disabled:pointer-events-none sm:w-auto ${date && courtId ? 'bg-[#1d4ed8] hover:bg-[#2563eb]' : 'bg-stone-300'}`}
                        >
                          Ver horarios disponibles
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {isMember && step === 'slots' && (
                <div className="space-y-6">
                  <p className="text-base font-medium text-stone-700">
                    <span className="font-bold text-stone-900">{courtName}</span>
                    {' · '}
                    {date &&
                      new Date(date + 'T12:00').toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                  </p>

                  {slotsToShow.length === 0 ? (
                    <p className="rounded-xl bg-amber-50 py-10 text-center text-base font-semibold text-amber-800">
                      {noSlotsMessage}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                      {slotsToShow.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl border py-5 font-bold transition ${selectedSlot === slot ? 'border-[#1d4ed8] bg-[#1d4ed8] text-white' : 'border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}
                        >
                          <span className="text-xl font-bold">{slot}</span>
                          <span className="mt-1.5 text-xs font-medium opacity-90">
                            Sesión 90&apos;
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex min-h-[44px] flex-col gap-2 pt-4 sm:flex-row sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('choose')}
                      className="min-h-[44px] w-full rounded-xl border border-stone-300 px-5 py-2.5 text-base font-bold text-stone-700 hover:bg-stone-100 sm:w-auto"
                    >
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedSlot && setStep('confirm')}
                      disabled={!selectedSlot}
                      className={`min-h-[44px] w-full rounded-xl px-6 py-3 text-base font-bold text-white transition disabled:opacity-50 disabled:pointer-events-none sm:ml-auto sm:w-auto ${selectedSlot ? 'bg-[#1d4ed8] hover:bg-[#2563eb]' : 'bg-stone-300'}`}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}

              {isMember && step === 'confirm' && (
                <form onSubmit={handleConfirm} className="space-y-6">
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-6">
                    <p className="text-sm font-bold uppercase tracking-wider text-stone-500">Resumen</p>
                    <p className="mt-2 text-lg font-bold text-stone-900">{courtName}</p>
                    <p className="mt-1 text-base font-medium text-stone-700">
                      {date &&
                        new Date(date + 'T12:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      {' · '}
                      {selectedSlot} – {slotEnd(selectedSlot).slice(0, 5)}
                    </p>
                    <p className="mt-3 text-base font-medium text-stone-600">
                      Depósito: <span className="font-bold text-stone-900">4,50 €</span>
                      <span className="ml-2 text-sm text-stone-500">(resto 13,50 € en el club)</span>
                    </p>
                  </div>
                  <div
                    className="mb-4 flex gap-3 rounded-r-lg border-l-[3px] py-3 pl-4 pr-4 text-sm text-stone-700"
                    style={{ backgroundColor: '#fefce8', borderLeftColor: '#f59e0b' }}
                  >
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" aria-hidden style={{ color: '#f59e0b' }} />
                    <div>
                      <p className="font-semibold text-stone-800">Política de cancelación</p>
                      <p className="mt-1 leading-snug">
                        Si cancelas con menos de 24 horas de antelación, perderás el depósito de la señal (4,50 €) y deberás abonar el importe restante (13,50 €) antes de poder realizar nuevas reservas.
                      </p>
                    </div>
                  </div>
                  {error && <p className="text-base font-medium text-red-600">{error}</p>}

                  <div className="flex min-h-[44px] flex-col gap-2 sm:flex-row sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('slots')}
                      className="min-h-[44px] w-full rounded-xl border border-stone-300 px-5 py-2.5 text-base font-bold text-stone-700 hover:bg-stone-100 sm:w-auto"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="min-h-[44px] w-full rounded-xl bg-[#1d4ed8] px-6 py-3 text-base font-bold text-white shadow-lg shadow-[#1d4ed8]/30 hover:bg-[#2563eb] disabled:opacity-60 sm:ml-auto sm:w-auto"
                    >
                      {loading ? 'Creando...' : 'Confirmar reserva'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
