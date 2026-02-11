import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { AdminCreateBookingModal } from '@/components/ui/admin-create-booking-modal';
import { AdminCreateBookingTrigger } from '@/components/ui/admin-create-booking-trigger';
import { AdminMarkRemainingPaidButton } from '@/components/ui/admin-mark-remaining-paid-button';

type PageProps = {
  searchParams: Promise<{ desde?: string; hasta?: string }> | { desde?: string; hasta?: string };
};

export default async function AdminReservasPage({ searchParams }: PageProps) {
  const params = typeof (searchParams as Promise<unknown>).then === 'function'
    ? await (searchParams as Promise<{ desde?: string; hasta?: string }>)
    : (searchParams as { desde?: string; hasta?: string });

  const desde = params?.desde?.trim().slice(0, 10);
  const hasta = params?.hasta?.trim().slice(0, 10);

  const supabase = createSupabaseServiceClient();

  let bookingsQuery = supabase
    .from('bookings')
    .select(
      'id, booking_date, start_time, end_time, status, deposit_paid, remaining_paid_at, profiles!bookings_user_id_fkey(full_name), courts(name)'
    )
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (desde) bookingsQuery = bookingsQuery.gte('booking_date', desde);
  if (hasta) bookingsQuery = bookingsQuery.lte('booking_date', hasta);

  const [
    { data: bookings },
    { data: courts },
    { data: profiles },
  ] = await Promise.all([
    bookingsQuery,
    supabase.from('courts').select('id, name').eq('is_active', true).order('name'),
    supabase.from('profiles').select('id, full_name, email').order('full_name'),
  ]);

  const courtsList = courts ?? [];
  const usersList = profiles ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader
          breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Reservas' }]}
          title="Reservas"
          subtitle="Consulta y gestiona todas las reservas. Crea reservas sin cobrar señal."
        />
        <AdminCreateBookingTrigger courts={courtsList} users={usersList} />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="desde" className="text-xs font-bold text-stone-600">Desde</label>
            <input
              id="desde"
              name="desde"
              type="date"
              defaultValue={desde ?? ''}
              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-[#B5235D] focus:ring-1 focus:ring-[#B5235D]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="hasta" className="text-xs font-bold text-stone-600">Hasta</label>
            <input
              id="hasta"
              name="hasta"
              type="date"
              defaultValue={hasta ?? ''}
              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-[#B5235D] focus:ring-1 focus:ring-[#B5235D]"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
          >
            Filtrar
          </button>
          {(desde || hasta) && (
            <a
              href="/admin/reservas"
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100"
            >
              Quitar filtro
            </a>
          )}
        </form>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold text-stone-500">{bookings?.length ?? 0} reservas en total</p>
          <a
            href={`/api/admin/bookings/export${desde || hasta ? `?${new URLSearchParams({ ...(desde && { desde }), ...(hasta && { hasta }) }).toString()}` : ''}`}
            className="rounded-xl border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100"
            download
          >
            Exportar CSV
          </a>
        </div>
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs font-bold uppercase tracking-wider text-stone-500">
                <th className="px-4 py-3 align-middle">Pista</th>
                <th className="px-4 py-3 align-middle">Usuario</th>
                <th className="px-4 py-3 align-middle">Fecha y hora</th>
                <th className="px-4 py-3 align-middle">Estado</th>
                <th className="px-4 py-3 align-middle">Resto pagado</th>
              </tr>
            </thead>
            <tbody>
              {bookings?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm font-medium text-stone-500">
                    No hay reservas registradas todavía.
                  </td>
                </tr>
              ) : (
                bookings?.map((b) => (
                  <tr key={b.id} className="border-b border-stone-100 transition hover:bg-stone-50">
                    <td className="px-4 py-3.5 align-middle font-bold text-stone-900">
                      {b.courts?.name ?? 'Pista'}
                    </td>
                    <td className="px-4 py-3.5 align-middle font-medium text-stone-800">
                      {b.profiles?.full_name ?? 'Usuario'}
                    </td>
                    <td className="px-4 py-3.5 align-middle font-medium text-stone-800">
                      <p className="leading-tight">{formatDate(b.booking_date)}</p>
                      <p className="mt-0.5 text-[11px] leading-tight text-stone-500">
                        {String(b.start_time).slice(0, 5)} - {String(b.end_time).slice(0, 5)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-bold leading-none ${
                            b.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : b.status === 'completed'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {b.status === 'confirmed' ? 'Confirmada' : b.status === 'completed' ? 'Completada' : 'Cancelada'}
                        </span>
                        {b.deposit_paid ? (
                          <span className="text-[11px] font-medium leading-none text-emerald-600">Depósito pagado</span>
                        ) : (
                          <span className="text-[11px] leading-none text-stone-500">Sin depósito (admin)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      {b.status === 'confirmed' && (
                        <AdminMarkRemainingPaidButton
                          bookingId={b.id}
                          alreadyPaid={!!(b as { remaining_paid_at?: string | null }).remaining_paid_at}
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

