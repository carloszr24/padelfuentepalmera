import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { getCachedAuth } from '@/lib/auth-server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';

const DAYS_FINANCIAL = 14;

export default async function AdminDashboardPage() {
  await getCachedAuth(); // reusa auth del layout (cache)
  const supabase = createSupabaseServiceClient();

  const since = new Date();
  since.setDate(since.getDate() - DAYS_FINANCIAL);
  const sinceStr = since.toISOString().slice(0, 10);

  const [
    { data: incomeTx },
    { count: bookingsCount },
    { count: usersCount },
    { count: activeCourtsCount },
    { data: latestBookings },
    { data: latestTransactions },
    { data: profilesForWallets },
    { data: txDaily },
    { data: bookingsDaily },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, type')
      .in('type', ['recharge', 'admin_recharge']),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('courts')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('bookings')
      .select(
        'id, booking_date, start_time, end_time, status, profiles!bookings_user_id_fkey(full_name), courts(name)'
      )
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('transactions')
      .select(
        'id, created_at, amount, type, profiles!transactions_user_id_fkey(full_name)'
      )
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('profiles').select('wallet_balance'),
    supabase
      .from('transactions')
      .select('created_at, amount')
      .in('type', ['recharge', 'admin_recharge'])
      .gte('created_at', since.toISOString()),
    supabase
      .from('bookings')
      .select('booking_date')
      .gte('booking_date', sinceStr),
  ]);

  const totalIncome =
    incomeTx?.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) ?? 0;
  const totalWallets =
    profilesForWallets?.reduce(
      (s, p) => s + Number(p.wallet_balance ?? 0),
      0
    ) ?? 0;

  const dayMap: Record<string, { bookings: number; recharge: number }> = {};
  for (let i = 0; i < DAYS_FINANCIAL; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap[key] = { bookings: 0, recharge: 0 };
  }
  for (const b of bookingsDaily ?? []) {
    const key = (b.booking_date as string).slice(0, 10);
    if (dayMap[key]) dayMap[key].bookings += 1;
  }
  for (const tx of txDaily ?? []) {
    const key = (tx.created_at as string).slice(0, 10);
    if (dayMap[key] && Number(tx.amount) > 0) dayMap[key].recharge += Number(tx.amount);
  }
  const dailyRows = Object.entries(dayMap).sort(
    (a, b) => b[0].localeCompare(a[0])
  );

  return (
    <div className="space-y-10">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Dashboard' }]}
        title="Resumen del club"
        subtitle="Controla la actividad: ingresos, reservas, usuarios y estado de las pistas."
      />

      <section className="grid grid-cols-2 items-stretch gap-4 lg:grid-cols-5">
        <StatCard
          label="Ingresos totales"
          value={`${totalIncome.toFixed(2)} €`}
          helper="Suma de recargas de monedero."
        />
        <StatCard
          label="Reservas"
          value={bookingsCount?.toString() ?? '0'}
          helper="Total de reservas registradas."
        />
        <StatCard
          label="Usuarios"
          value={usersCount?.toString() ?? '0'}
          helper="Perfiles registrados en el sistema."
        />
        <StatCard
          label="Pistas activas"
          value={activeCourtsCount?.toString() ?? '0'}
          helper="Pistas disponibles para reservar."
        />
        <StatCard
          label="Total en monederos"
          value={`${totalWallets.toFixed(2)} €`}
          helper="Suma del saldo actual de todos los clientes."
        />
      </section>

      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-stone-800">
          Resumen día a día (últimos {DAYS_FINANCIAL} días)
        </h2>
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Reservas</th>
                <th className="px-4 py-3">Recargas (€)</th>
              </tr>
            </thead>
            <tbody>
              {dailyRows.map(([dateStr, row]) => (
                <tr key={dateStr} className="border-b border-stone-100 text-stone-800 transition hover:bg-stone-50">
                  <td className="px-4 py-2.5 font-medium">
                    {new Date(dateStr).toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </td>
                  <td className="px-4 py-2.5">{row.bookings}</td>
                  <td className="px-4 py-2.5 font-bold text-emerald-600">
                    {row.recharge > 0 ? `+${row.recharge.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-stone-800">
            Últimas reservas
          </h2>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            {latestBookings && latestBookings.length > 0 ? (
              <ul className="divide-y divide-stone-200 text-sm">
                {latestBookings.map((booking) => {
                  const profile = booking.profiles;
                  const profileName = typeof profile === 'object' && profile !== null && 'full_name' in profile
                    ? (profile as { full_name: string | null }).full_name
                    : null;
                  const court = booking.courts;
                  const courtName = typeof court === 'object' && court !== null && 'name' in court
                    ? (court as { name: string }).name
                    : null;
                  return (
                  <li
                    key={booking.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 text-xs transition hover:bg-stone-50 md:text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-stone-900">
                        {courtName ?? 'Pista'}
                      </p>
                      <p className="truncate text-[11px] font-medium text-stone-600">
                        {profileName ?? 'Usuario'}
                      </p>
                      <p className="mt-1 text-[11px] text-stone-500">
                        {formatDate(booking.booking_date)} ·{' '}
                        {String(booking.start_time).slice(0, 5)} -{' '}
                        {String(booking.end_time).slice(0, 5)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold capitalize ${
                        booking.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : booking.status === 'completed'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {booking.status === 'confirmed'
                        ? 'Confirmada'
                        : booking.status === 'completed'
                        ? 'Completada'
                        : 'Cancelada'}
                    </span>
                  </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm font-medium text-stone-600">
                No hay reservas recientes.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-stone-800">
            Últimas transacciones
          </h2>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            {latestTransactions && latestTransactions.length > 0 ? (
              <ul className="divide-y divide-stone-200 text-sm">
                {latestTransactions.map((tx) => {
                  const txProfile = tx.profiles;
                  const txProfileName = typeof txProfile === 'object' && txProfile !== null && 'full_name' in txProfile
                    ? (txProfile as { full_name: string | null }).full_name
                    : null;
                  return (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 text-xs transition hover:bg-stone-50 md:text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-stone-900">
                        {getTransactionLabel(tx.type)}
                      </p>
                      <p className="truncate text-[11px] font-medium text-stone-600">
                        {txProfileName ?? 'Usuario'}
                      </p>
                      <p className="mt-1 text-[11px] text-stone-500">
                        {formatDateTime(tx.created_at)}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {tx.amount >= 0 ? '+' : ''}
                      {Number(tx.amount).toFixed(2)} €
                    </p>
                  </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm font-medium text-stone-600">
                No hay transacciones recientes.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
};

function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <div className="flex h-full min-h-[140px] flex-col rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm transition hover:border-stone-300 hover:bg-white">
      <div className="min-h-[2.5rem]">
        <p className="line-clamp-2 text-xs font-bold uppercase tracking-wider text-stone-500">{label}</p>
      </div>
      <p className="mt-3 shrink-0 text-2xl font-bold leading-tight text-stone-900 tabular-nums whitespace-nowrap">{value}</p>
      {helper ? (
        <p className="mt-2 line-clamp-2 min-h-[2rem] text-[11px] font-medium leading-snug text-stone-500">{helper}</p>
      ) : (
        <div className="mt-2 min-h-[2rem]" />
      )}
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  });
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTransactionLabel(
  type: 'recharge' | 'booking_deposit' | 'admin_recharge' | 'refund'
): string {
  switch (type) {
    case 'recharge':
      return 'Recarga monedero';
    case 'admin_recharge':
      return 'Recarga admin';
    case 'booking_deposit':
      return 'Señal reserva';
    case 'refund':
      return 'Reembolso señal';
    default:
      return 'Transacción';
  }
}

