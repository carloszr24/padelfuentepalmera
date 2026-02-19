import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { getCachedAuth } from '@/lib/auth-server';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>Resumen del club</h1>
        <p className="mt-0.5 text-[13px] text-[#6b6b6b]">Controla la actividad: ingresos, reservas, usuarios y estado de las pistas.</p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

      <section className="rounded-[10px] bg-[#f7f7f5] p-5">
        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.06em] text-[#6b6b6b]">
          Resumen día a día (últimos {DAYS_FINANCIAL} días)
        </h2>
        <div className="admin-table-wrap overflow-x-auto rounded-[10px] bg-white">
          <table className="admin-table w-full min-w-[280px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#e8e8e4]">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Reservas</th>
                <th className="px-4 py-3">Recargas (€)</th>
              </tr>
            </thead>
            <tbody>
              {dailyRows.map(([dateStr, row]) => (
                <tr key={dateStr} className="border-b border-[#e8e8e4] text-[#1a1a1a] transition hover:bg-black/[0.02]">
                  <td className="font-medium">
                    {new Date(dateStr).toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </td>
                  <td className="admin-number">{row.bookings}</td>
                  <td>
                    <span className={`whitespace-nowrap ${row.recharge > 0 ? 'admin-amount-positive' : 'text-[#6b6b6b]'}`}>
                      {row.recharge > 0 ? `+${row.recharge.toFixed(2)} €` : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[10px] bg-[#f7f7f5] p-5">
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.06em] text-[#6b6b6b]">
            Últimas reservas
          </h2>
          <div className="overflow-x-auto rounded-[10px] bg-white">
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
                      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
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

        <div className="rounded-[10px] bg-[#f7f7f5] p-5">
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.06em] text-[#6b6b6b]">
            Últimas transacciones
          </h2>
          <div className="overflow-x-auto rounded-[10px] bg-white">
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
                      className={`text-sm font-semibold tabular-nums ${
                        tx.amount >= 0 ? 'admin-amount-positive' : 'text-[#dc2626]'
                      }`}
                      style={tx.amount >= 0 ? { fontFamily: 'var(--font-space-grotesk)' } : undefined}
                    >
                      <span className="whitespace-nowrap">{tx.amount >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2)} €</span>
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
    <div className="admin-stat-card flex min-h-[120px] flex-col justify-center text-center">
      <p className="admin-stat-label">{label}</p>
      <p className="admin-number mt-2 text-2xl leading-tight text-[#1a1a1a] tabular-nums md:text-[26px]"><span className="whitespace-nowrap">{value}</span></p>
      {helper ? (
        <p className="mt-1 line-clamp-2 text-xs font-medium text-[#6b6b6b]">{helper}</p>
      ) : null}
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
      return 'Depósito reserva';
    case 'refund':
      return 'Reembolso depósito';
    default:
      return 'Transacción';
  }
}

