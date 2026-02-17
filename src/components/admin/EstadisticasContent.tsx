'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { AdminPageHeader } from '@/components/ui/admin-page-header';

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '1m', label: 'Último mes' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: '1y', label: 'Último año' },
  { value: 'all', label: 'Todo' },
] as const;

type PeriodKey = (typeof PERIOD_OPTIONS)[number]['value'];

type ApiStats = {
  by_hour: { hour: number; total: number }[];
  by_dow: { day_of_week: number; total: number }[];
  by_court: { name: string; total: number }[];
  by_date: { booking_date: string; total: number }[];
  by_status: { status: string; total: number }[];
  noshows: number;
  total_for_noshow_rate: number;
};

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show: 'No-show',
  completed: 'Completada',
};
const CHART_COLORS = ['#059669', '#1d4ed8', '#dc2626', '#d97706', '#6b7280'];

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

export default function EstadisticasContent() {
  const [period, setPeriod] = useState<PeriodKey>('1m');
  const [data, setData] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = `period=${period}`;

  const fetchStats = (useFresh = false) => {
    setLoading(true);
    setError(null);
    const url = `/api/admin/stats/bookings?${query}${useFresh ? '&fresh=1' : ''}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar');
        return res.json();
      })
      .then(setData)
      .catch(() => setError('No se pudieron cargar las estadísticas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats(false);
  }, [query]);

  const {
    totalReservas,
    tasaCancelacion,
    tasaNoshow,
    horaPunta,
    hourChartData,
    dowChartData,
    courtChartData,
    evolutionData,
    statusPieData,
  } = useMemo(() => {
    if (!data) {
      return {
        totalReservas: 0,
        tasaCancelacion: 0,
        tasaNoshow: 0,
        horaPunta: '—',
        hourChartData: [] as { hour: number; name: string; total: number }[],
        dowChartData: [] as { day_of_week: number; name: string; total: number }[],
        courtChartData: [] as { name: string; total: number }[],
        evolutionData: [] as { date: string; total: number; label: string }[],
        statusPieData: [] as { name: string; value: number }[],
      };
    }

    const byStatus = data.by_status ?? [];
    const totalReservas = byStatus.reduce((s, x) => s + Number(x.total), 0);
    const cancelled = byStatus.find((x) => x.status === 'cancelled')?.total ?? 0;
    const tasaCancelacion = totalReservas > 0 ? (Number(cancelled) / totalReservas) * 100 : 0;
    const totalDenom = data.total_for_noshow_rate ?? 0;
    const tasaNoshow = totalDenom > 0 ? (Number(data.noshows ?? 0) / totalDenom) * 100 : 0;

    const byHour = data.by_hour ?? [];
    const hourMap = new Map(byHour.map((x) => [x.hour, Number(x.total)]));
    const hourChartData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      name: formatHour(i),
      total: hourMap.get(i) ?? 0,
    }));
    const maxHourEntry = byHour.length ? byHour.reduce((a, b) => (a.total >= b.total ? a : b)) : null;
    const horaPunta = maxHourEntry != null ? formatHour(maxHourEntry.hour) : '—';

    const byDow = data.by_dow ?? [];
    const dowMap = new Map(byDow.map((x) => [x.day_of_week, Number(x.total)]));
    const dowChartData = [1, 2, 3, 4, 5, 6, 0].map((dow) => ({
      day_of_week: dow,
      name: DAY_LABELS[dow],
      total: dowMap.get(dow) ?? 0,
    }));

    const courtChartData = (data.by_court ?? []).map((x) => ({
      name: x.name,
      total: Number(x.total),
    }));

    const byDate = data.by_date ?? [];
    const evolutionData = byDate
      .slice()
      .sort((a, b) => a.booking_date.localeCompare(b.booking_date))
      .map((x) => {
        const d = new Date(x.booking_date + 'T12:00:00');
        const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        return { date: x.booking_date, total: Number(x.total), label };
      });

    const statusPieData = (data.by_status ?? [])
      .filter((x) => Number(x.total) > 0)
      .map((x) => ({
        name: STATUS_LABELS[x.status] ?? x.status,
        value: Number(x.total),
      }));

    return {
      totalReservas,
      tasaCancelacion,
      tasaNoshow,
      horaPunta,
      hourChartData,
      dowChartData,
      courtChartData,
      evolutionData,
      statusPieData,
    };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Estadísticas' }]}
          title="Estadísticas de reservas"
          subtitle="Horas punta, días y pistas más demandados."
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-stone-200 bg-stone-50 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl border border-stone-200 bg-stone-50 animate-pulse" />
        <div className="h-64 rounded-xl border border-stone-200 bg-stone-50 animate-pulse" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Estadísticas' }]}
          title="Estadísticas de reservas"
          subtitle="Horas punta, días y pistas más demandados."
        />
        <p className="rounded-xl bg-red-50 py-8 text-center font-semibold text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <AdminPageHeader
          breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Estadísticas' }]}
          title="Estadísticas de reservas"
          subtitle="Horas punta, días y pistas más demandados."
        />
        <div className="flex min-h-[44px] flex-wrap items-center gap-2">
          <label htmlFor="period-stats" className="text-sm font-semibold text-stone-600">
            Período:
          </label>
          <select
            id="period-stats"
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] md:w-auto"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fetchStats(true)}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* 4 tarjetas resumen */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Total reservas</p>
          <p className="mt-1 text-2xl font-bold text-stone-900">{totalReservas}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Tasa cancelación</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{tasaCancelacion.toFixed(1)} %</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Tasa no-show</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{tasaNoshow.toFixed(1)} %</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Hora punta</p>
          <p className="mt-1 text-2xl font-bold text-[#1d4ed8]">{horaPunta}</p>
        </div>
      </section>

      {/* Reservas por hora */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="mb-4 text-sm font-bold text-stone-900">Reservas por hora del día</h2>
        <div className="h-[280px] w-full md:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v ?? 0, 'Reservas']} labelFormatter={(l) => `${l} h`} />
              <Bar dataKey="total" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="Reservas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Reservas por día de la semana */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="mb-4 text-sm font-bold text-stone-900">Reservas por día de la semana</h2>
        <div className="h-[280px] w-full md:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dowChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v ?? 0, 'Reservas']} />
              <Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} name="Reservas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Reservas por pista (horizontal) */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="mb-4 text-sm font-bold text-stone-900">Reservas por pista</h2>
        <div className="h-[240px] w-full md:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={courtChartData}
              layout="vertical"
              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v ?? 0, 'Reservas']} />
              <Bar dataKey="total" fill="#1d4ed8" radius={[0, 4, 4, 0]} name="Reservas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Evolución diaria */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="mb-4 text-sm font-bold text-stone-900">Evolución diaria de reservas</h2>
        <div className="h-[280px] w-full md:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v ?? 0, 'Reservas']} />
              <Line type="monotone" dataKey="total" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} name="Reservas" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Distribución por estado (tarta) */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="mb-4 text-sm font-bold text-stone-900">Distribución por estado</h2>
        {statusPieData.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-500">Sin datos en este período</p>
        ) : (
          <div className="mx-auto h-[260px] w-full max-w-sm md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {statusPieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v ?? 0, 'Reservas']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
