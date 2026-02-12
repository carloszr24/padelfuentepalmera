import Link from 'next/link';
import { getCachedAuth } from '@/lib/auth-server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';

export default async function PanelPage() {
  const { user, profile, supabase } = await getCachedAuth();

  if (!user) return null;

  const displayName =
    profile?.full_name ||
    (user.user_metadata?.full_name as string) ||
    user.email?.split('@')[0] ||
    'Jugador';
  const balance = profile?.wallet_balance ?? 0;

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_date, start_time, end_time, status, courts(name)')
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .gte('booking_date', new Date().toISOString().slice(0, 10))
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(5);

  return (
    <div className="space-y-10">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Inicio' }]}
        title={`Hola, ${displayName}`}
        subtitle="Aquí puedes ver tus próximas reservas, tu monedero y gestionar tu actividad en el club."
      />

      <section className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm transition hover:border-stone-300 hover:bg-white">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Saldo monedero</p>
          <p className="mt-3 text-2xl font-bold text-stone-900">{Number(balance).toFixed(2)} €</p>
          <Link href="/panel/monedero" className="mt-2 inline-block text-xs font-bold text-[#1d4ed8] hover:text-[#1e40af]">
            Recargar →
          </Link>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm transition hover:border-stone-300 hover:bg-white">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Mis reservas</p>
          <p className="mt-3 text-2xl font-bold text-stone-900">{bookings?.length ?? 0}</p>
          <Link href="/panel/reservas" className="mt-2 inline-block text-xs font-bold text-[#1d4ed8] hover:text-[#1e40af]">
            Ver todas →
          </Link>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm transition hover:border-stone-300 hover:bg-white col-span-2 lg:col-span-1">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Señal por reserva</p>
          <p className="mt-3 text-2xl font-bold text-stone-900">4,50 €</p>
          <p className="mt-1.5 text-[11px] font-medium text-stone-500">Resto se paga en el club</p>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">Próximas reservas</h2>
          <Link
            href="/panel/reservas"
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
          >
            Nueva reserva
          </Link>
        </div>
        {!bookings?.length ? (
          <p className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-sm font-medium text-stone-600">
            No tienes reservas próximas. Crea una desde Reservas.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <ul className="divide-y divide-stone-200 text-sm">
              {bookings.map((b: { id: string; booking_date: string; start_time: string; end_time: string; status: string; courts: { name: string } | null }) => (
                <li key={b.id} className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-stone-50">
                  <div>
                    <p className="font-bold text-stone-900">{displayName} · {b.courts?.name ?? 'Pista'}</p>
                    <p className="text-[11px] font-medium text-stone-600">
                      {new Date(b.booking_date).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}{' '}
                      · {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">Confirmada</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
