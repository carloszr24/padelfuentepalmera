'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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

type PanelReservasClientProps = {
  initialCourts?: Court[];
  initialBookings?: BookingRow[];
};

export function PanelReservasClient({ initialCourts = [], initialBookings }: PanelReservasClientProps) {
  const { user, balance, hasDebt, debtAmount, profile, refreshProfile } = usePanelUser();
  const [courts, setCourts] = useState<Court[]>(initialCourts);
  const [bookings, setBookings] = useState<BookingRow[] | null>(initialBookings ?? null);
  const [tab, setTab] = useState<TabKey>('proximas');

  const isBlocked = hasDebt || balance < 0;
  const displayDebtAmount = hasDebt ? debtAmount : balance < 0 ? Math.abs(balance) : 0;

  // Solo hacer fetch en cliente si no nos pasaron datos iniciales (ej. navegación client-side)
  useEffect(() => {
    if (!user?.id || initialBookings !== undefined) return;
    let cancelled = false;
    const supabase = getBrowserSupabaseClient();
    Promise.all([
      fetch('/api/panel/courts').then((r) => r.json()),
      supabase
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

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      {isBlocked && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-800">
          Tienes una deuda pendiente de{' '}
          <span className="whitespace-nowrap">{displayDebtAmount.toFixed(2).replace('.', ',')} €</span>. Recarga tu
          monedero para poder reservar.
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader
          breadcrumbs={[{ label: 'Inicio', href: '/panel' }, { label: 'Reservas' }]}
          title="Mis reservas"
          subtitle="Todas tus reservas. El depósito (4,50 €) se descuenta del monedero."
        />
        <div className="flex flex-wrap items-center gap-2">
          {isBlocked ? (
            <span className="cursor-not-allowed rounded-full border border-stone-300 bg-stone-200 px-4 py-2 text-sm font-bold text-stone-500">
              Nueva reserva
            </span>
          ) : (
            <BookingModal courts={courts} triggerLabel="Nueva reserva" onSuccess={onBookingChange} />
          )}
          <Link
            href="/panel"
            className="min-h-[44px] inline-flex items-center rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
            prefetch
          >
            Volver al inicio
          </Link>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
        {(['proximas', 'pasadas', 'canceladas'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`min-h-[44px] flex-1 rounded-lg px-3 py-2 text-sm font-bold transition md:flex-none md:px-4 ${
              tab === key
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {key === 'proximas' ? 'Próximas' : key === 'pasadas' ? 'Pasadas' : 'Canceladas'}
          </button>
        ))}
      </div>

      <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-4 shadow-sm">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm font-medium text-stone-500">{emptyMessage}</p>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ date, items }) => (
              <div key={date}>
                <h3 className="mb-2 text-sm font-bold capitalize text-stone-700">
                  {formatDateHeader(date)}
                </h3>
                <div className="space-y-3 md:overflow-x-auto">
                  <div className="hidden min-w-[480px] md:block">
                    <table className="w-full text-left text-sm">
                      <tbody>
                        {items.map((b) => {
                          const courtName = Array.isArray(b.courts) ? b.courts[0]?.name : (b.courts as { name?: string } | null)?.name;
                          return (
                            <tr key={b.id} className="border-b border-stone-100 transition hover:bg-stone-50">
                              <td className="px-4 py-3 font-bold text-stone-900">{courtName ?? 'Pista'}</td>
                              <td className="px-4 py-3 font-medium text-stone-800">{b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : b.status === 'completed' ? 'bg-sky-100 text-sky-700' : 'bg-red-100 text-red-700'}`}>
                                  {b.status === 'confirmed' ? 'Confirmada' : b.status === 'completed' ? 'Completada' : 'Cancelada'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <CancelBookingButton bookingId={b.id} depositPaid={b.deposit_paid} status={b.status} bookingDate={b.booking_date} startTime={b.start_time} walletBalance={profile?.wallet_balance ?? 0} onCancelSuccess={onBookingChange} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="space-y-3 md:hidden">
                    {items.map((b) => {
                      const courtName = Array.isArray(b.courts) ? b.courts[0]?.name : (b.courts as { name?: string } | null)?.name;
                      return (
                        <div key={b.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-stone-900">{courtName ?? 'Pista'}</p>
                            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : b.status === 'completed' ? 'bg-sky-100 text-sky-700' : 'bg-red-100 text-red-700'}`}>
                              {b.status === 'confirmed' ? 'Confirmada' : b.status === 'completed' ? 'Completada' : 'Cancelada'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-stone-800">{b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}</p>
                          <div className="mt-3">
                            <CancelBookingButton bookingId={b.id} depositPaid={b.deposit_paid} status={b.status} bookingDate={b.booking_date} startTime={b.start_time} walletBalance={profile?.wallet_balance ?? 0} onCancelSuccess={onBookingChange} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
