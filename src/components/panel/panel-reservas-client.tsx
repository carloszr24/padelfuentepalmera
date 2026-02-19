'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookingModal } from '@/components/ui/booking-modal';
import { CancelBookingButton } from '@/components/ui/cancel-booking-button';
import { PanelReservasSkeleton } from '@/components/ui/panel-page-skeleton';
import { usePanelUser } from '@/contexts/panel-user-context';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

type Court = { id: string; name: string };

type BookingRow = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  deposit_paid: boolean;
  courts: { name: string } | { name: string }[] | null;
};

const today = () => new Date().toISOString().slice(0, 10);

function formatDateHeader(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

type TabKey = 'proximas' | 'pasadas' | 'canceladas';

function filterByTab(bookings: BookingRow[], tab: TabKey): BookingRow[] {
  const t = today();
  if (tab === 'proximas') {
    return bookings.filter((b) => b.booking_date >= t && b.status !== 'cancelled').sort((a, b) => a.booking_date.localeCompare(b.booking_date) || a.start_time.localeCompare(b.start_time));
  }
  if (tab === 'pasadas') {
    return bookings.filter((b) => b.booking_date < t && b.status !== 'cancelled').sort((a, b) => b.booking_date.localeCompare(a.booking_date) || b.start_time.localeCompare(a.start_time));
  }
  return bookings.filter((b) => b.status === 'cancelled').sort((a, b) => b.booking_date.localeCompare(a.booking_date));
}

function groupByDate(bookings: BookingRow[]): { date: string; items: BookingRow[] }[] {
  const map = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const list = map.get(b.booking_date) ?? [];
    list.push(b);
    map.set(b.booking_date, list);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function isTomorrow(dateStr: string): boolean {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t.toISOString().slice(0, 10) === dateStr;
}

function isToday(dateStr: string): boolean {
  return dateStr === today();
}

function getCourtShortName(courts: BookingRow['courts']): string {
  const name = Array.isArray(courts) ? courts[0]?.name : (courts as { name?: string } | null)?.name;
  if (!name) return 'P';
  const m = name.match(/\d+/);
  return m ? `P${m[0]}` : name.slice(0, 2).toUpperCase();
}

type PanelReservasClientProps = {
  initialCourts?: Court[];
  initialBookings?: BookingRow[] | null;
};

export function PanelReservasClient({ initialCourts = [], initialBookings }: PanelReservasClientProps) {
  const { user, profile, hasDebt, balance, refreshProfile } = usePanelUser();
  const [courts, setCourts] = useState<Court[]>(initialCourts);
  const [bookings, setBookings] = useState<BookingRow[] | null>(initialBookings ?? null);
  const [tab, setTab] = useState<TabKey>('proximas');

  const isBlocked = hasDebt || balance < 0;

  useEffect(() => {
    if (!user?.id || initialBookings !== undefined) return;
    let cancelled = false;
    Promise.all([
      fetch('/api/panel/courts').then((r) => r.json()),
      getBrowserSupabaseClient()
        .from('bookings')
        .select('id, booking_date, start_time, end_time, status, deposit_paid, courts(name)')
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false }),
    ]).then(([courtsRes, bookingsRes]) => {
      if (cancelled) return;
      setCourts((courtsRes?.courts ?? []) as Court[]);
      setBookings(bookingsRes.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, initialBookings]);

  const onBookingChange = () => {
    if (!user?.id) return;
    refreshProfile();
    getBrowserSupabaseClient()
      .from('bookings')
      .select('id, booking_date, start_time, end_time, status, deposit_paid, courts(name)')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .then(({ data }) => setBookings(data ?? []));
  };

  if (bookings === null) {
    return <PanelReservasSkeleton />;
  }

  const filtered = filterByTab(bookings, tab);
  const grouped = groupByDate(filtered);

  const emptyMessage =
    tab === 'proximas'
      ? 'No tienes reservas próximas'
      : tab === 'pasadas'
        ? 'No tienes reservas pasadas'
        : 'No tienes reservas canceladas';

  const cardClass = 'rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-card)] p-6 shadow-[var(--panel-shadow-sm)]';
  const tabsClass = 'flex gap-0.5 rounded-[10px] p-0.5 md:w-fit md:flex-initial';
  const tabBg = '#f0f0ec';

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-bold tracking-tight text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '24px' }}>
            Mis reservas
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--panel-text-secondary)]">
            El depósito (4,50 €) se descuenta del monedero.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isBlocked ? (
            <span className="cursor-not-allowed rounded-lg border border-stone-300 bg-stone-200 px-4 py-2.5 text-sm font-bold text-stone-500">
              Nueva reserva
            </span>
          ) : (
            <BookingModal courts={courts} triggerLabel="Nueva reserva" onSuccess={onBookingChange} />
          )}
          <Link href="/panel" className="rounded-lg border border-[var(--panel-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--panel-text)] hover:bg-[var(--panel-bg)]" prefetch>
            Volver al inicio
          </Link>
        </div>
      </div>

      {isBlocked && (
        <div className="rounded-[var(--panel-radius)] border border-[#fecaca] p-4" style={{ background: 'var(--panel-red-bg)' }}>
          <p className="text-sm font-medium text-[var(--panel-red)]">
            Tienes una deuda pendiente. Recarga tu monedero para poder reservar.
          </p>
          <Link href="/panel/monedero" className="mt-2 inline-block text-sm font-semibold text-[var(--panel-accent)] hover:underline">
            Ir al monedero →
          </Link>
        </div>
      )}

      <div className={tabsClass} style={{ background: tabBg }}>
        {(['proximas', 'pasadas', 'canceladas'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition md:flex-none md:px-5 ${
              tab === key ? 'bg-white text-[var(--panel-text)] shadow-[var(--panel-shadow-sm)]' : 'text-[var(--panel-text-secondary)] hover:text-[var(--panel-text)]'
            }`}
          >
            {key === 'proximas' ? 'Próximas' : key === 'pasadas' ? 'Pasadas' : 'Canceladas'}
          </button>
        ))}
      </div>

      <div className={cardClass}>
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--panel-text-secondary)]">{emptyMessage}</p>
        ) : (
          <div className="space-y-0">
            {grouped.map(({ date, items }) => (
              <div key={date}>
                <p className="flex items-center gap-2 border-b border-[var(--panel-border)] py-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--panel-text-secondary)]">
                  {formatDateHeader(date)}
                  {isTomorrow(date) && <span className="rounded bg-[var(--panel-accent)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">Mañana</span>}
                  {isToday(date) && <span className="rounded bg-[var(--panel-accent)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">Hoy</span>}
                </p>
                {/* Desktop: grid rows */}
                <div className="hidden md:block">
                  {items.map((b) => {
                    const courtName = Array.isArray(b.courts) ? b.courts[0]?.name : (b.courts as { name?: string } | null)?.name;
                    return (
                      <div
                        key={b.id}
                        className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2 border-b border-[var(--panel-border)] py-4 last:border-0"
                      >
                        <span className="text-sm font-semibold">{courtName ?? 'Pista'}</span>
                        <span className="font-medium text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '14px' }}>
                          {b.start_time.slice(0, 5)} — {b.end_time.slice(0, 5)}
                        </span>
                        {b.status === 'cancelled' ? (
                          <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--panel-red-bg)', color: 'var(--panel-red)' }}>Cancelada</span>
                        ) : b.status === 'completed' ? (
                          <span className="text-xs font-semibold text-[var(--panel-text-secondary)]">Completada</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--panel-green-bg)', color: 'var(--panel-green)' }}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" /> Confirmada
                          </span>
                        )}
                        {b.booking_date >= today() && b.status !== 'cancelled' && (
                          <CancelBookingButton
                            bookingId={b.id}
                            depositPaid={b.deposit_paid}
                            status={b.status}
                            bookingDate={b.booking_date}
                            startTime={b.start_time}
                            walletBalance={profile?.wallet_balance ?? 0}
                            onCancelSuccess={onBookingChange}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Mobile: cards */}
                <div className="space-y-2.5 md:hidden">
                  {items.map((b) => {
                    const courtName = Array.isArray(b.courts) ? b.courts[0]?.name : (b.courts as { name?: string } | null)?.name;
                    const short = getCourtShortName(b.courts);
                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                            style={{ background: 'linear-gradient(135deg, #dbeafe, #eff6ff)', color: 'var(--panel-accent)' }}
                          >
                            {short}
                          </div>
                          <div>
                            <p className="font-bold text-[var(--panel-text)]">{courtName ?? 'Pista'}</p>
                            <p className="text-sm font-medium text-[var(--panel-text-secondary)]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                              {b.start_time.slice(0, 5)} — {b.end_time.slice(0, 5)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {b.status === 'cancelled' ? (
                            <span className="rounded-md px-2 py-1 text-[10px] font-bold" style={{ background: 'var(--panel-red-bg)', color: 'var(--panel-red)' }}>Cancelada</span>
                          ) : (
                            <span className="rounded-md px-2 py-1 text-[10px] font-bold" style={{ background: 'var(--panel-green-bg)', color: 'var(--panel-green)' }}>Confirmada</span>
                          )}
                          {b.booking_date >= today() && b.status !== 'cancelled' && (
                            <CancelBookingButton
                              bookingId={b.id}
                              depositPaid={b.deposit_paid}
                              status={b.status}
                              bookingDate={b.booking_date}
                              startTime={b.start_time}
                              walletBalance={profile?.wallet_balance ?? 0}
                              onCancelSuccess={onBookingChange}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
