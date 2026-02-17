'use client';

import { useState, useEffect } from 'react';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

type PeriodKey = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '1m', label: 'Último mes' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: '1y', label: 'Último año' },
  { value: 'all', label: 'Todo' },
];

type MonthRow = {
  month: string;
  stripeIncome: number;
  adminIncome: number;
  stripeFees: number;
  netProfit: number;
  txCount: number;
};

type DailyRow = {
  date: string;
  income: number;
  fees: number;
  net: number;
};

type DayTransaction = {
  created_at: string;
  full_name: string | null;
  type: string;
  amount: number;
  fee: number;
};

type Stats = {
  months: MonthRow[];
  daily: DailyRow[];
  totals: {
    totalIncome: number;
    totalStripeFees: number;
    totalNet: number;
    txCount: number;
  };
  date?: string | null;
  transactions?: DayTransaction[] | null;
};

function formatEur(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} €`;
}

function formatMonth(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

function formatDay(key: string): string {
  return new Date(key).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function FinanzasContent() {
  const [period, setPeriod] = useState<PeriodKey>('1y');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = selectedDate
    ? `date=${encodeURIComponent(selectedDate)}`
    : `period=${period}`;

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/stats?${query}`)
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar');
        return res.json();
      })
      .then(setData)
      .catch(() => setError('No se pudieron cargar las estadísticas'))
      .finally(() => setLoading(false));
  }, [query]);

  if (loading && !data) {
    return (
      <div className="space-y-8">
        <AdminPageHeader
          breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Finanzas' }]}
          title="Dashboard financiero"
          subtitle="Ingresos, comisiones Stripe y beneficio neto."
        />
        <p className="py-12 text-center text-stone-500">Cargando...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-8">
        <AdminPageHeader
          breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Finanzas' }]}
          title="Dashboard financiero"
          subtitle="Ingresos, comisiones Stripe y beneficio neto."
        />
        <p className="rounded-xl bg-red-50 py-8 text-center font-semibold text-red-700">{error}</p>
      </div>
    );
  }

  const stats = data!;
  const { totals, months, daily, date: filterDate, transactions: dayTransactions } = stats;
  const isDayView = Boolean(filterDate && dayTransactions);

  const barData = months.map((m) => ({
    name: formatMonth(m.month),
    Ingresos: m.stripeIncome + m.adminIncome,
    Comisiones: m.stripeFees,
    'Beneficio neto': m.netProfit,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <AdminPageHeader
          breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Finanzas' }]}
          title="Dashboard financiero"
          subtitle="Ingresos, comisiones Stripe y beneficio neto."
        />
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-4">
          <div className="flex min-h-[44px] items-center gap-2">
            <label htmlFor="period" className="text-sm font-semibold text-stone-600">
              Período:
            </label>
            <select
              id="period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
              disabled={!!selectedDate}
              className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] disabled:opacity-60 disabled:cursor-not-allowed md:w-auto"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="day" className="text-sm font-semibold text-stone-600">
              Día concreto:
            </label>
            <input
              id="day"
              type="date"
              value={selectedDate ?? ''}
              onChange={(e) => setSelectedDate(e.target.value || null)}
              className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] md:w-auto"
            />
          </div>
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="min-h-[44px] w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100 md:w-auto"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Ingresos totales</p>
          <p className="mt-2 text-2xl font-bold text-emerald-800"><span className="whitespace-nowrap">{formatEur(totals.totalIncome)}</span></p>
        </div>
        <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">Comisiones Stripe</p>
          <p className="mt-2 text-2xl font-bold text-red-800"><span className="whitespace-nowrap">{formatEur(totals.totalStripeFees)}</span></p>
        </div>
        <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-[#1d4ed8]/20 bg-[#1d4ed8]/5 p-5 shadow-sm text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-[#1d4ed8]">Beneficio neto</p>
          <p className="mt-2 text-2xl font-bold text-[#1d4ed8]"><span className="whitespace-nowrap">{formatEur(totals.totalNet)}</span></p>
        </div>
        <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-600">Transacciones</p>
          <p className="mt-2 text-2xl font-bold text-stone-900">{totals.txCount}</p>
        </div>
      </div>

      {isDayView && (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <h2 className="border-b border-stone-200 px-5 py-4 text-base font-bold text-stone-900">
            Transacciones del {filterDate ? formatDay(filterDate) : ''}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs font-bold uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-3 align-middle">Hora</th>
                  <th className="px-4 py-3 align-middle">Usuario</th>
                  <th className="px-4 py-3 align-middle">Tipo</th>
                  <th className="px-4 py-3 align-middle text-right">Importe</th>
                  <th className="px-4 py-3 align-middle text-right">Comisión</th>
                </tr>
              </thead>
              <tbody>
                {(dayTransactions ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-stone-500">
                      No hay transacciones ese día.
                    </td>
                  </tr>
                ) : (
                  (dayTransactions ?? []).map((tx, i) => (
                    <tr key={i} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-3.5 tabular-nums text-stone-700">{formatTime(tx.created_at)}</td>
                      <td className="px-4 py-3.5 font-medium text-stone-900">{tx.full_name ?? '—'}</td>
                      <td className="px-4 py-3.5 text-stone-700">{tx.type}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-emerald-700"><span className="whitespace-nowrap">{formatEur(tx.amount)}</span></td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-red-700"><span className="whitespace-nowrap">{formatEur(tx.fee)}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isDayView && barData.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-900 md:text-base">Ingresos y comisiones por mes</h2>
          <div className="h-[250px] w-full md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}€`} />
                <Tooltip formatter={(v) => formatEur(Number(v ?? 0))} />
                <Legend wrapperStyle={{ paddingTop: 8 }} layout="horizontal" verticalAlign="bottom" />
                <Bar dataKey="Ingresos" fill="#059669" radius={[4, 4, 0, 0]} name="Ingresos" />
                <Bar dataKey="Comisiones" fill="#dc2626" radius={[4, 4, 0, 0]} name="Comisiones Stripe" />
                <Line type="monotone" dataKey="Beneficio neto" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 4 }} name="Beneficio neto" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!isDayView && daily.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:p-5">
          <h2 className="mb-4 text-sm font-bold text-stone-900 md:text-base">Evolución diaria (últimos 30 días)</h2>
          <div className="h-[250px] w-full md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}€`} />
                <Tooltip
                  labelFormatter={(label) => formatDay(String(label ?? ''))}
                  formatter={(v) => formatEur(Number(v ?? 0))}
                />
                <Legend wrapperStyle={{ paddingTop: 8 }} layout="horizontal" verticalAlign="bottom" />
                <Area type="monotone" dataKey="income" stackId="1" stroke="#059669" fill="#059669" fillOpacity={0.4} name="Ingresos" />
                <Area type="monotone" dataKey="fees" stackId="2" stroke="#dc2626" fill="#f87171" fillOpacity={0.3} name="Comisiones" />
                <Line type="monotone" dataKey="net" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} name="Beneficio neto" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!isDayView && (
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <h2 className="border-b border-stone-200 px-5 py-4 text-base font-bold text-stone-900">
          Desglose por mes
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs font-bold uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3 align-middle">Mes</th>
                <th className="px-4 py-3 align-middle text-right">Recargas Stripe</th>
                <th className="px-4 py-3 align-middle text-right">Recargas Admin</th>
                <th className="px-4 py-3 align-middle text-right">Comisiones</th>
                <th className="px-4 py-3 align-middle text-right">Beneficio neto</th>
              </tr>
            </thead>
            <tbody>
              {months.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-stone-500">
                    No hay datos en este período.
                  </td>
                </tr>
              ) : (
                months.map((m) => (
                  <tr key={m.month} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-3.5 font-medium text-stone-900">{formatMonth(m.month)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-emerald-700"><span className="whitespace-nowrap">{formatEur(m.stripeIncome)}</span></td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-stone-700"><span className="whitespace-nowrap">{formatEur(m.adminIncome)}</span></td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-red-700"><span className="whitespace-nowrap">{formatEur(m.stripeFees)}</span></td>
                    <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-[#1d4ed8]"><span className="whitespace-nowrap">{formatEur(m.netProfit)}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
