'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PanelPageSkeleton } from '@/components/ui/panel-page-skeleton';
import { BookingModal } from '@/components/ui/booking-modal';
import { CancelBookingButton } from '@/components/ui/cancel-booking-button';
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

export function PanelInicioClient() {
  const { user, displayName, balance, hasDebt, debtAmount, profile, refreshProfile } = usePanelUser();
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [txSummary, setTxSummary] = useState<{ lastRechargeDate: string | null; rechargeAmount: number | null; bookingsThisMonth: number } | null>(null);

  const isBlocked = hasDebt || balance < 0;
  const displayDebtAmount = hasDebt ? debtAmount : balance < 0 ? Math.abs(balance) : 0;
  const nextBooking = bookings?.length ? bookings[0] : null;

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const supabase = getBrowserSupabaseClient();
    Promise.all([
      supabase.from('courts').select('id, name').eq('is_active', true).order('name'),
      supabase
        .from('bookings')
        .select('id, booking_date, start_time, end_time, status, deposit_paid, courts(name)')
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'completed'])
        .gte('booking_date', new Date().toISOString().slice(0, 10))
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5),
      supabase
        .from('transactions')
        .select('created_at, amount, type')
        .eq('user_id', user.id)
        .in('type', ['recharge', 'admin_recharge'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('booking_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
        .lte('booking_date', new Date().toISOString().slice(0, 10)),
    ]).then(([courtsRes, bookingsRes, lastRechargeRes, bookingsMonthRes]) => {
      if (cancelled) return;
      setCourts((courtsRes.data ?? []).map((c) => ({ id: String(c.id), name: c.name ?? '' })));
      setBookings(bookingsRes.data ?? []);
      const lastTx = lastRechargeRes.data;
      const monthCount = (bookingsMonthRes as { count?: number } | null)?.count ?? 0;
      setTxSummary({
        lastRechargeDate: lastTx?.created_at ? new Date(lastTx.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : null,
        rechargeAmount: lastTx?.amount != null ? Number(lastTx.amount) : null,
        bookingsThisMonth: monthCount,
      });
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
      .in('status', ['confirmed', 'completed'])
      .gte('booking_date', new Date().toISOString().slice(0, 10))
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5)
      .then(({ data }) => setBookings(data ?? []));
  };

  if (bookings === null) {
    return <PanelPageSkeleton />;
  }

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      {isBlocked && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-800">
          <p>Tienes una deuda pendiente de <span className="whitespace-nowrap">{displayDebtAmount.toFixed(2).replace('.', ',')} €</span>.</p>
          <Link
            href="/panel/monedero"
            className="mt-3 inline-block min-h-[44px] rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
            prefetch
          >
            Recargar ahora
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Saldo actual</p>
        <p className={`mt-2 text-2xl font-bold ${balance < 0 ? 'text-amber-700' : 'text-stone-900'}`}>
          <span className="whitespace-nowrap">
            {balance < 0 ? '-' : ''}{Math.abs(Number(balance)).toFixed(2)} €
          </span>
          {balance < 0 && <span className="ml-2 text-base font-semibold text-amber-700">(deuda)</span>}
        </p>
        <Link
          href="/panel/monedero"
          className="mt-3 inline-block min-h-[44px] rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
          prefetch
        >
          Recargar
        </Link>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-stone-800">Próxima reserva</h2>
        {nextBooking ? (
          <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <p className="font-bold text-stone-900">
              {Array.isArray(nextBooking.courts) ? nextBooking.courts[0]?.name : (nextBooking.courts as { name?: string } | null)?.name ?? 'Pista'}
            </p>
            <p className="mt-1 text-sm text-stone-600">
              {new Date(nextBooking.booking_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
            <p className="text-sm font-medium text-stone-800">
              {nextBooking.start_time.slice(0, 5)} - {nextBooking.end_time.slice(0, 5)}
            </p>
            <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              Confirmada
            </span>
            <div className="mt-3">
              <CancelBookingButton
                bookingId={nextBooking.id}
                depositPaid={nextBooking.deposit_paid}
                status={nextBooking.status}
                bookingDate={nextBooking.booking_date}
                startTime={nextBooking.start_time}
                walletBalance={profile?.wallet_balance ?? 0}
                onCancelSuccess={onBookingChange}
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-600">No tienes reservas próximas</p>
        )}
        <div className="mt-4">
          {isBlocked ? (
            <span className="inline-block min-h-[48px] w-full cursor-not-allowed rounded-xl bg-stone-200 py-3 text-center text-base font-bold text-stone-500">
              Nueva reserva (recarga antes)
            </span>
          ) : (
            <div className="[&>button]:min-h-[48px] [&>button]:w-full [&>button]:rounded-xl [&>button]:bg-green-600 [&>button]:py-3 [&>button]:text-base [&>button]:font-bold [&>button]:text-white [&>button]:hover:bg-green-700 md:[&>button]:bg-blue-600 md:[&>button]:hover:bg-blue-700">
              <BookingModal courts={courts} triggerLabel="Nueva reserva" onSuccess={onBookingChange} />
            </div>
          )}
        </div>
      </div>

      {txSummary && (txSummary.bookingsThisMonth > 0 || txSummary.lastRechargeDate) && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
          {txSummary.bookingsThisMonth > 0 && (
            <p>Reservas este mes: {txSummary.bookingsThisMonth}</p>
          )}
          {txSummary.lastRechargeDate != null && txSummary.rechargeAmount != null && (
            <p>Última recarga: {txSummary.lastRechargeDate} — {txSummary.rechargeAmount.toFixed(2)} €</p>
          )}
        </div>
      )}
    </div>
  );
}
