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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export function PanelReservasClient() {
  const { user, balance, hasDebt, debtAmount, profile, refreshProfile } = usePanelUser();
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);

  const isBlocked = hasDebt || balance < 0;
  const displayDebtAmount = hasDebt ? debtAmount : balance < 0 ? Math.abs(balance) : 0;

  useEffect(() => {
    if (!user?.id) return;
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
  }, [user?.id]);

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

      <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold text-stone-500">{bookings.length} reservas en total</p>
        </div>
        <div className="min-w-0 overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs font-bold uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3 align-middle">Pista</th>
                <th className="px-4 py-3 align-middle">Fecha y hora</th>
                <th className="px-4 py-3 align-middle">Estado</th>
                <th className="px-4 py-3 align-middle">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!bookings.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm font-medium text-stone-500">
                    Aún no tienes reservas. Cuando crees una, aparecerá aquí.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const courtName =
                    Array.isArray(b.courts) ? b.courts[0]?.name : (b.courts as { name?: string } | null)?.name;
                  return (
                    <tr key={b.id} className="border-b border-stone-100 transition hover:bg-stone-50">
                      <td className="px-4 py-3 align-middle font-bold text-stone-900">{courtName ?? 'Pista'}</td>
                      <td className="px-4 py-3 align-middle font-medium text-stone-800">
                        <p className="leading-tight">{formatDate(b.booking_date)}</p>
                        <p className="mt-0.5 text-xs leading-tight text-stone-500">
                          {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ${
                              b.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : b.status === 'completed'
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {b.status === 'confirmed'
                              ? 'Confirmada'
                              : b.status === 'completed'
                                ? 'Completada'
                                : 'Cancelada'}
                          </span>
                          {b.deposit_paid && (
                            <span className="text-xs font-medium leading-none text-emerald-600">Depósito pagado</span>
                          )}
                        </div>
                      </td>
                      <td className="min-w-[140px] px-4 py-3 align-middle">
                        <CancelBookingButton
                          bookingId={b.id}
                          depositPaid={b.deposit_paid}
                          status={b.status}
                          bookingDate={b.booking_date}
                          startTime={b.start_time}
                          walletBalance={profile?.wallet_balance ?? 0}
                          onCancelSuccess={onBookingChange}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
