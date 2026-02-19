'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { AdminMarkRemainingPaidButton } from '@/components/ui/admin-mark-remaining-paid-button';
import { AdminCancelBookingButton } from '@/components/ui/admin-cancel-booking-button';
import { AdminNoshowButton } from '@/components/ui/admin-noshow-button';

export type BookingRow = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  deposit_paid: boolean;
  remaining_paid_at?: string | null;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  courts: { name: string } | { name: string }[] | null;
};

type TabKey = 'hoy' | 'proximas' | 'pasadas' | 'canceladas';

const TAB_LABELS: Record<TabKey, string> = {
  hoy: 'Hoy',
  proximas: 'Próximas',
  pasadas: 'Pasadas',
  canceladas: 'Canceladas',
};

const EMPTY_MESSAGES: Record<TabKey, string> = {
  hoy: 'No hay reservas para hoy',
  proximas: 'No hay reservas próximas',
  pasadas: 'No hay reservas pasadas',
  canceladas: 'No hay reservas canceladas',
};

function getTodayMadrid(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTimeRange(start: string, end: string): string {
  return `${String(start).slice(0, 5)} - ${String(end).slice(0, 5)}`;
}

function getCourtName(b: BookingRow): string {
  const c = b.courts;
  return Array.isArray(c) ? c[0]?.name ?? 'Pista' : (c as { name?: string } | null)?.name ?? 'Pista';
}

function getProfileName(b: BookingRow): string {
  const p = b.profiles;
  return Array.isArray(p) ? p[0]?.full_name ?? 'Usuario' : (p as { full_name?: string } | null)?.full_name ?? 'Usuario';
}

function partitionBookings(bookings: BookingRow[], todayMadrid: string) {
  const canceladas = bookings.filter((b) => b.status === 'cancelled' || b.status === 'no_show');
  const rest = bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'no_show');
  const hoy = rest.filter((b) => b.booking_date === todayMadrid);
  const proximas = rest.filter((b) => b.booking_date > todayMadrid && b.status === 'confirmed');
  const pasadas = rest.filter(
    (b) => b.booking_date < todayMadrid || b.status === 'completed'
  );
  return { hoy, proximas, pasadas, canceladas };
}

function groupByDate(
  list: BookingRow[],
  order: 'asc' | 'desc',
  timeOrder: 'asc' | 'desc'
): Map<string, BookingRow[]> {
  const map = new Map<string, BookingRow[]>();
  for (const b of list) {
    const key = b.booking_date;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(b);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => {
      const cmp = a.start_time.localeCompare(b.start_time);
      return timeOrder === 'asc' ? cmp : -cmp;
    });
  }
  const sortedKeys = Array.from(map.keys()).sort((a, b) =>
    order === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
  );
  const result = new Map<string, BookingRow[]>();
  for (const k of sortedKeys) result.set(k, map.get(k)!);
  return result;
}

function downloadCsv(bookings: BookingRow[], tab: TabKey) {
  const headers = ['Fecha', 'Hora', 'Pista', 'Usuario', 'Estado'];
  const rows = bookings.map((b) => [
    b.booking_date,
    formatTimeRange(b.start_time, b.end_time),
    getCourtName(b),
    getProfileName(b),
    b.status === 'confirmed' ? 'Confirmada' : b.status === 'completed' ? 'Completada' : b.status === 'no_show' ? 'No-show' : 'Cancelada',
  ]);
  const escape = (v: string) => (v.includes(';') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [headers.map(escape).join(';'), ...rows.map((r) => r.map(escape).join(';'))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reservas-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type AdminReservasContentProps = {
  bookings: BookingRow[];
  desde?: string | null;
  hasta?: string | null;
};

export function AdminReservasContent({ bookings, desde, hasta }: AdminReservasContentProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('hoy');
  const todayMadrid = useMemo(() => getTodayMadrid(), []);

  const { hoy, proximas, pasadas, canceladas } = useMemo(
    () => partitionBookings(bookings, todayMadrid),
    [bookings, todayMadrid]
  );

  const counts: Record<TabKey, number> = useMemo(
    () => ({
      hoy: hoy.length,
      proximas: proximas.length,
      pasadas: pasadas.length,
      canceladas: canceladas.length,
    }),
    [hoy.length, proximas.length, pasadas.length, canceladas.length]
  );

  const activeList = useMemo(() => {
    switch (activeTab) {
      case 'hoy':
        return hoy;
      case 'proximas':
        return proximas;
      case 'pasadas':
        return pasadas;
      case 'canceladas':
        return canceladas;
      default:
        return [];
    }
  }, [activeTab, hoy, proximas, pasadas, canceladas]);

  const grouped = useMemo(() => {
    switch (activeTab) {
      case 'hoy':
        return groupByDate(activeList, 'asc', 'asc');
      case 'proximas':
        return groupByDate(activeList, 'asc', 'asc');
      case 'pasadas':
      case 'canceladas':
        return groupByDate(activeList, 'desc', 'desc');
      default:
        return new Map<string, BookingRow[]>();
    }
  }, [activeTab, activeList]);

  const isToday = (dateStr: string) => dateStr === todayMadrid;
  const isTomorrow = (dateStr: string) => {
    const t = new Date(todayMadrid + 'T12:00:00');
    t.setDate(t.getDate() + 1);
    return dateStr === t.toISOString().slice(0, 10);
  };

  const handleExport = () => {
    downloadCsv(activeList, activeTab);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-stone-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Tabs">
          {(['hoy', 'proximas', 'pasadas', 'canceladas'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap rounded-t-xl border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab
                  ? 'border-[#1d4ed8] bg-[#1d4ed8] text-white'
                  : 'border-transparent border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300 hover:bg-stone-100'
              }`}
            >
              {TAB_LABELS[tab]} ({counts[tab]})
            </button>
          ))}
        </nav>
      </div>

      {/* Filtros + Export + Create: se mantienen en el server page, aquí solo Export por tab */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-xs font-semibold text-stone-500">
          {activeList.length} reservas en este tab
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="min-h-[44px] inline-flex items-center rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
        >
          Exportar CSV
        </button>
      </div>

      {/* Contenido agrupado por fecha */}
      {activeList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[10px] bg-[#f7f7f5] py-16 text-center">
          <span className="mb-2 text-4xl text-stone-300" aria-hidden>📅</span>
          <p className="text-sm font-medium text-stone-500">{EMPTY_MESSAGES[activeTab]}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([dateStr, rows]) => (
            <div key={dateStr}>
              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-t-xl bg-gray-50 px-4 py-3 text-base font-semibold text-stone-800">
                <span>{formatDateHeader(dateStr)}</span>
                {isToday(dateStr) && (
                  <span className="rounded-full bg-[#1d4ed8] px-2.5 py-0.5 text-xs font-bold text-white">
                    Hoy
                  </span>
                )}
                {isTomorrow(dateStr) && (
                  <span className="rounded-full bg-stone-400 px-2.5 py-0.5 text-xs font-bold text-white">
                    Mañana
                  </span>
                )}
              </div>
              <div className="admin-table-wrap overflow-x-auto rounded-b-[10px] bg-white">
                <table className="admin-table w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-[#e8e8e4]">
                      <th className="px-4 py-3 align-middle">Pista</th>
                      <th className="px-4 py-3 align-middle">Usuario</th>
                      <th className="px-4 py-3 align-middle">Hora</th>
                      <th className="px-4 py-3 align-middle">Estado</th>
                      <th className="px-4 py-3 align-middle">Resto pagado</th>
                      <th className="px-4 py-3 align-middle">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((b) => {
                      const startTimeStr = String(b.start_time).slice(0, 5);
                      const isPast =
                        b.booking_date < todayMadrid ||
                        (b.booking_date === todayMadrid && startTimeStr <= new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }));
                      const showNoshow = b.status === 'confirmed' && isPast;
                      return (
                        <tr key={b.id} className="border-b border-[#e8e8e4] transition hover:bg-black/[0.02]">
                          <td className="px-4 py-3 align-middle font-bold text-stone-900">
                            {getCourtName(b)}
                          </td>
                          <td className="px-4 py-3 align-middle font-medium text-stone-800">
                            {getProfileName(b)}
                          </td>
                          <td className="px-4 py-3 align-middle font-medium text-stone-800">
                            {formatTimeRange(b.start_time, b.end_time)}
                          </td>
                          <td className="px-4 py-3 align-middle text-center">
                            <div className="flex flex-col gap-1 items-center">
                              <span
                                className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ${
                                  b.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : b.status === 'completed'
                                      ? 'bg-sky-100 text-sky-700'
                                      : b.status === 'no_show'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {b.status === 'confirmed'
                                  ? 'Confirmada'
                                  : b.status === 'completed'
                                    ? 'Completada'
                                    : b.status === 'no_show'
                                      ? 'No-show'
                                      : 'Cancelada'}
                              </span>
                              {b.deposit_paid ? (
                                <span className="text-[11px] font-medium leading-none text-emerald-600">
                                  Depósito pagado
                                </span>
                              ) : (
                                <span className="text-[11px] leading-none text-stone-500">
                                  Sin depósito (admin)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {b.status === 'confirmed' && (
                              <AdminMarkRemainingPaidButton
                                bookingId={b.id}
                                alreadyPaid={!!b.remaining_paid_at}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {b.status === 'confirmed' && (
                              <div className="flex flex-col gap-2 items-start">
                                <AdminCancelBookingButton bookingId={b.id} />
                                {showNoshow && <AdminNoshowButton bookingId={b.id} />}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
