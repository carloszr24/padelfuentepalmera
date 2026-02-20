'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookingModal } from '@/components/ui/booking-modal';
import { CancelBookingButton } from '@/components/ui/cancel-booking-button';
import { PanelPageSkeleton } from '@/components/ui/panel-page-skeleton';
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

type TxRow = {
  id: string;
  created_at: string;
  amount: number;
  type: string;
  description: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getMovementLabel(tx: TxRow): string {
  if (tx.description?.trim()) return tx.description;
  const labels: Record<string, string> = {
    recharge: 'Recarga monedero',
    admin_recharge: 'Recarga admin',
    booking_deposit: 'Depósito reserva',
    refund: 'Reembolso',
    late_cancellation: 'Penalización cancelación tardía',
    no_show_penalty: 'Penalización no-show',
    debt_payment: 'Pago de deuda',
  };
  return labels[tx.type] ?? 'Movimiento';
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

export function PanelInicioClient() {
  const { user, displayName, balance, hasDebt, debtAmount, profile, refreshProfile } = usePanelUser();
  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [transactions, setTransactions] = useState<TxRow[] | null>(null);
  const [stats, setStats] = useState<{
    bookingsThisMonth: number;
    lastRechargeDate: string | null;
    gastoTotal: number;
  } | null>(null);

  const isBlocked = hasDebt || balance < 0;
  const displayDebtAmount = hasDebt ? debtAmount : balance < 0 ? Math.abs(balance) : 0;
  const upcoming = (bookings ?? []).filter((b) => b.booking_date >= today() && b.status !== 'cancelled').sort((a, b) => a.booking_date.localeCompare(b.booking_date) || a.start_time.localeCompare(b.start_time));
  const nextBooking = upcoming[0] ?? null;
  const proximasCount = upcoming.length;

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const supabase = getBrowserSupabaseClient();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

    const perfLog = typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || (window as unknown as { __PANEL_PERF?: string }).__PANEL_PERF === '1');

    if (perfLog) console.time('[panel] dashboard Promise.all (courts, bookings, transactions, monthCount)');
    Promise.all([
      supabase.from('courts').select('id, name').eq('is_active', true).order('name'),
      supabase
        .from('bookings')
        .select('id, booking_date, start_time, end_time, status, deposit_paid, courts(name)')
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(50),
      supabase
        .from('transactions')
        .select('id, created_at, amount, type, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('booking_date', startOfMonth)
        .lte('booking_date', today()),
    ]).then(([courtsRes, bookingsRes, txRes, monthRes]) => {
      if (perfLog) console.timeEnd('[panel] dashboard Promise.all (courts, bookings, transactions, monthCount)');
      if (cancelled) return;
      setCourts((courtsRes.data ?? []).map((c) => ({ id: String(c.id), name: c.name ?? '' })));
      setBookings(bookingsRes.data ?? []);
      const txs = (txRes.data ?? []) as TxRow[];
      setTransactions(txs);
      const monthCount = (monthRes as { count?: number } | null)?.count ?? 0;
      const lastRecharge = txs.find((t) => t.type === 'recharge' || t.type === 'admin_recharge');
      const gastoTotal = txs
        .filter((t) => t.amount < 0 && t.created_at.slice(0, 10) >= startOfMonth)
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
      setStats({
        bookingsThisMonth: monthCount,
        lastRechargeDate: lastRecharge?.created_at ? new Date(lastRecharge.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : null,
        gastoTotal,
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
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(50)
      .then(({ data }) => setBookings(data ?? []));
  };

  const proximasBookings = bookings?.filter((b) => b.booking_date >= today() && b.status !== 'cancelled') ?? [];
  const pasadasBookings = bookings?.filter((b) => b.booking_date < today() && b.status !== 'cancelled') ?? [];
  const canceladasBookings = bookings?.filter((b) => b.status === 'cancelled') ?? [];
  const [tabReservas, setTabReservas] = useState<'proximas' | 'pasadas' | 'canceladas'>('proximas');
  const reservasForTab =
    tabReservas === 'proximas' ? proximasBookings : tabReservas === 'pasadas' ? pasadasBookings : canceladasBookings;
  const groupedReservas = groupByDate(reservasForTab);
  const recentMovements = (transactions ?? []).slice(0, 5);

  if (bookings === null) {
    return <PanelPageSkeleton />;
  }

  const cardClass =
    'rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-card)] p-6 shadow-[var(--panel-shadow-sm)] transition-all duration-250 hover:shadow-[var(--panel-shadow-md)] hover:-translate-y-0.5';
  const labelClass = 'text-[11px] font-semibold uppercase tracking-widest text-[var(--panel-text-secondary)] mb-2.5';

  return (
    <div className="min-w-0 max-w-full space-y-7 overflow-x-hidden">
      {/* Desktop page header */}
      <div className="mb-8 hidden md:block">
        <p className="text-[13px] font-medium uppercase tracking-wide text-[var(--panel-text-secondary)]">Panel de usuario</p>
        <h1 className="mt-1.5 font-bold tracking-tight text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '28px' }}>
          Hola, {displayName} 👋
        </h1>
      </div>

      {isBlocked && (
        <div
          className="flex flex-col items-start justify-between gap-3 rounded-[var(--panel-radius)] border border-[#fecaca] p-4 md:flex-row md:items-center"
          style={{ background: 'var(--panel-red-bg)' }}
        >
          <div className="flex items-center gap-3 text-sm font-medium text-[var(--panel-red)]">
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Tienes una deuda pendiente de {displayDebtAmount.toFixed(2).replace('.', ',')} €. Recarga tu monedero para poder reservar.
          </div>
          <Link
            href="/panel/monedero"
            className="shrink-0 rounded-lg bg-[var(--panel-red)] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-red-700"
          >
            Recargar ahora
          </Link>
        </div>
      )}

      {/* Grid 3: Saldo, Próxima reserva, Este mes (desktop) */}
      <div className="hidden gap-5 md:grid md:grid-cols-3">
        <div className={`relative overflow-hidden ${cardClass}`}>
          <div className="absolute -right-10 -top-10 h-[120px] w-[120px] rounded-full opacity-60" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02))' }} />
          <p className={labelClass}>Saldo actual</p>
          <p className="mb-3.5 font-bold tracking-tight text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '36px' }}>
            {balance < 0 ? '-' : ''}{Math.abs(Number(balance)).toFixed(2).replace('.', ',')} <span className="text-[22px] font-medium text-[var(--panel-text-secondary)]">€</span>
          </p>
          <Link
            href="/panel/monedero"
            className="block w-full rounded-[10px] bg-[var(--panel-accent)] py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[var(--panel-accent-hover)] hover:-translate-y-px"
          >
            Recargar monedero
          </Link>
        </div>

        <div className={`border-l-4 border-[var(--panel-green)] ${cardClass}`}>
          <p className={labelClass}>Próxima reserva</p>
          {nextBooking ? (
            <>
              <p className="font-bold tracking-tight text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '20px' }}>
                {Array.isArray(nextBooking.courts) ? nextBooking.courts[0]?.name : (nextBooking.courts as { name?: string } | null)?.name ?? 'Pista'}
              </p>
              <p className="text-sm text-[var(--panel-text-secondary)]">{formatDateHeader(nextBooking.booking_date)}</p>
              <p className="font-semibold text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '18px' }}>
                {nextBooking.start_time.slice(0, 5)} — {nextBooking.end_time.slice(0, 5)}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--panel-green-bg)', color: 'var(--panel-green)' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" /> Confirmada
              </span>
            </>
          ) : (
            <p className="text-sm text-[var(--panel-text-secondary)]">No tienes reservas próximas</p>
          )}
        </div>

        <div className={cardClass}>
          <p className={labelClass}>Este mes</p>
          <div className="space-y-0 border-b border-[var(--panel-border)]">
            <div className="flex justify-between py-2.5">
              <span className="text-[13px] text-[var(--panel-text-secondary)]">Reservas</span>
              <span className="font-semibold text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '15px' }}>{stats?.bookingsThisMonth ?? 0}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--panel-border)] py-2.5">
              <span className="text-[13px] text-[var(--panel-text-secondary)]">Última recarga</span>
              <span className="font-semibold text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '15px' }}>{stats?.lastRechargeDate ?? '—'}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--panel-border)] py-2.5">
              <span className="text-[13px] text-[var(--panel-text-secondary)]">Gasto total</span>
              <span className="font-semibold text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '15px' }}>
                {stats ? `${stats.gastoTotal.toFixed(2).replace('.', ',')} €` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Nueva reserva (desktop) */}
      <div className="hidden md:block">
        {isBlocked ? (
          <button type="button" disabled className="w-full cursor-not-allowed rounded-[var(--panel-radius)] bg-stone-300 py-4 text-base font-bold text-stone-500">
            Nueva reserva (recarga antes)
          </button>
        ) : (
          <BookingModal
            courts={courts}
            triggerLabel="Nueva reserva"
            onSuccess={onBookingChange}
            triggerClassName="flex w-full items-center justify-center gap-2.5 rounded-[var(--panel-radius)] bg-[var(--panel-green)] py-4 text-base font-bold text-white shadow-[0_8px_24px_rgba(5,150,105,0.3)] transition hover:-translate-y-0.5 hover:bg-[#047857] hover:shadow-[0_8px_24px_rgba(5,150,105,0.4)]"
          />
        )}
      </div>

      {/* Bottom grid: Mis reservas + Movimientos (desktop) */}
      <div className="hidden gap-5 lg:grid lg:grid-cols-[2fr_1fr]">
        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold tracking-tight text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '18px' }}>Mis reservas</h3>
            <Link href="/panel/reservas" className="text-[13px] font-semibold text-[var(--panel-accent)] hover:opacity-80">
              Ver todas →
            </Link>
          </div>
          <div className="mb-5 flex gap-0.5 rounded-[10px] p-0.5" style={{ background: '#f0f0ec' }}>
            {(['proximas', 'pasadas', 'canceladas'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTabReservas(key)}
                className={`rounded-lg px-5 py-2 text-[13px] font-semibold transition ${
                  tabReservas === key ? 'bg-white text-[var(--panel-text)] shadow-[var(--panel-shadow-sm)]' : 'text-[var(--panel-text-secondary)] hover:text-[var(--panel-text)]'
                }`}
              >
                {key === 'proximas' && `Próximas ${proximasCount > 0 ? proximasCount : ''}`}
                {key === 'pasadas' && 'Pasadas'}
                {key === 'canceladas' && 'Canceladas'}
              </button>
            ))}
          </div>
          {groupedReservas.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--panel-text-secondary)]">
              {tabReservas === 'proximas' ? 'No tienes reservas próximas' : tabReservas === 'pasadas' ? 'No tienes reservas pasadas' : 'No tienes reservas canceladas'}
            </p>
          ) : (
            <div className="space-y-0">
              {groupedReservas.map(({ date, items }) => (
                <div key={date}>
                  <p className="flex items-center gap-2.5 border-b border-[var(--panel-border)] py-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--panel-text-secondary)]">
                    {formatDateHeader(date)}
                    {isTomorrow(date) && <span className="rounded bg-[var(--panel-accent)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">Mañana</span>}
                    {isToday(date) && <span className="rounded bg-[var(--panel-accent)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">Hoy</span>}
                  </p>
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
                          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--panel-red-bg)', color: 'var(--panel-red)' }}>Cancelada</span>
                        ) : b.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-[var(--panel-text-secondary)]">Completada</span>
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
              ))}
            </div>
          )}
        </div>

        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold tracking-tight text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '18px' }}>Movimientos</h3>
            <Link href="/panel/monedero" className="text-[13px] font-semibold text-[var(--panel-accent)] hover:opacity-80">
              Ver todos →
            </Link>
          </div>
          {recentMovements.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--panel-text-secondary)]">Aún no hay movimientos</p>
          ) : (
            <div className="space-y-0">
              {recentMovements.map((tx) => (
                <div key={tx.id} className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-[var(--panel-border)] py-3 last:border-0">
                  <div>
                    <p className="text-[13px] font-medium text-[var(--panel-text)]">{getMovementLabel(tx)}</p>
                    <p className="text-xs text-[var(--panel-text-secondary)]">{formatDateShort(tx.created_at)}</p>
                  </div>
                  <span className={`text-right font-semibold tabular-nums`} style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '14px', color: tx.amount >= 0 ? 'var(--panel-green)' : 'var(--panel-red)' }}>
                    {tx.amount >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2).replace('.', ',')} €
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: saldo horizontal, próxima reserva con cancelar, quick stats, movimientos como tarjetas */}
      <div className="space-y-4 md:hidden">
        <div className="flex items-center justify-between gap-4 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-card)] p-5 shadow-[var(--panel-shadow-sm)]">
          <div>
            <p className={labelClass}>Saldo</p>
            <p className="font-bold tracking-tight text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '32px' }}>
              {balance < 0 ? '-' : ''}{Math.abs(Number(balance)).toFixed(2).replace('.', ',')} <span className="text-xl font-medium text-[var(--panel-text-secondary)]">€</span>
            </p>
          </div>
          <Link href="/panel/monedero" className="rounded-[12px] bg-[var(--panel-accent)] px-5 py-3 text-sm font-bold text-white">
            Recargar
          </Link>
        </div>

        {nextBooking && (
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] border-l-4 border-l-[var(--panel-green)] bg-[var(--panel-card)] p-5 shadow-[var(--panel-shadow-sm)]">
            <p className={labelClass}>Próxima reserva</p>
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '20px' }}>
                {Array.isArray(nextBooking.courts) ? nextBooking.courts[0]?.name : (nextBooking.courts as { name?: string } | null)?.name ?? 'Pista'}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: 'var(--panel-green-bg)', color: 'var(--panel-green)' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" /> Confirmada
              </span>
            </div>
            <p className="text-sm text-[var(--panel-text-secondary)]">{formatDateHeader(nextBooking.booking_date)}</p>
            <p className="font-semibold text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '18px' }}>
              {nextBooking.start_time.slice(0, 5)} — {nextBooking.end_time.slice(0, 5)}
            </p>
            <div className="mt-4">
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
        )}

        {!isBlocked && (
          <BookingModal
            courts={courts}
            triggerLabel="Nueva reserva"
            onSuccess={onBookingChange}
            triggerClassName="flex w-full items-center justify-center gap-2.5 rounded-[var(--panel-radius)] bg-[var(--panel-green)] py-4 text-base font-bold text-white shadow-[0_4px_16px_rgba(5,150,105,0.25)]"
          />
        )}

        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-[12px] border border-[var(--panel-border)] bg-[var(--panel-card)] p-3.5 text-center shadow-[var(--panel-shadow-sm)]">
            <p className="font-bold tracking-tight text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '22px' }}>{stats?.bookingsThisMonth ?? 0}</p>
            <p className="text-[11px] font-medium text-[var(--panel-text-secondary)]">Reservas</p>
          </div>
          <div className="rounded-[12px] border border-[var(--panel-border)] bg-[var(--panel-card)] p-3.5 text-center shadow-[var(--panel-shadow-sm)]">
            <p className="font-bold tracking-tight text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '22px' }}>{stats?.lastRechargeDate ?? '—'}</p>
            <p className="text-[11px] font-medium text-[var(--panel-text-secondary)]">Últ. recarga</p>
          </div>
          <div className="rounded-[12px] border border-[var(--panel-border)] bg-[var(--panel-card)] p-3.5 text-center shadow-[var(--panel-shadow-sm)]">
            <p className="font-bold tracking-tight text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '22px' }}>{stats ? `${stats.gastoTotal.toFixed(0)} €` : '—'}</p>
            <p className="text-[11px] font-medium text-[var(--panel-text-secondary)]">Gasto mes</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '17px' }}>Últimos movimientos</h3>
            <Link href="/panel/monedero" className="text-[13px] font-semibold text-[var(--panel-accent)]">Ver todo</Link>
          </div>
          {recentMovements.slice(0, 3).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-[12px] border border-[var(--panel-border)] bg-[var(--panel-card)] p-4 shadow-[var(--panel-shadow-sm)]">
              <div>
                <p className="text-sm font-semibold text-[var(--panel-text)]">{getMovementLabel(tx)}</p>
                <p className="text-xs text-[var(--panel-text-secondary)]">{formatDateShort(tx.created_at)}</p>
              </div>
              <span className="font-bold tabular-nums" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '15px', color: tx.amount >= 0 ? 'var(--panel-green)' : 'var(--panel-red)' }}>
                {tx.amount >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2).replace('.', ',')} €
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
