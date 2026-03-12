import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { AdminCreateBookingTrigger } from '@/components/ui/admin-create-booking-trigger';
import { AdminReservasContent, type BookingRow } from '@/components/admin/AdminReservasContent';

const ADMIN_RESERVAS_CACHE_SECONDS = 30;

type PageProps = {
  searchParams: Promise<{ desde?: string; hasta?: string }> | { desde?: string; hasta?: string };
};

async function getCachedReservasData(desde: string, hasta: string) {
  return unstable_cache(
    async () => {
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
      return { bookings: bookings ?? [], courts: courts ?? [], profiles: profiles ?? [] };
    },
    ['admin-reservas', desde, hasta],
    { revalidate: ADMIN_RESERVAS_CACHE_SECONDS }
  )();
}

export default async function AdminReservasPage({ searchParams }: PageProps) {
  const params =
    typeof (searchParams as Promise<unknown>).then === 'function'
      ? await (searchParams as Promise<{ desde?: string; hasta?: string }>)
      : (searchParams as { desde?: string; hasta?: string });

  const desde = params?.desde?.trim().slice(0, 10) ?? '';
  const hasta = params?.hasta?.trim().slice(0, 10) ?? '';

  const { bookings, courts, profiles } = await getCachedReservasData(desde, hasta);

  const courtsList = courts;
  const usersList = profiles;
  const bookingsList = bookings as BookingRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader
          breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Reservas' }]}
          title="Reservas"
          subtitle="Consulta y gestiona todas las reservas. Crea reservas sin cobrar depósito."
        />
        <AdminCreateBookingTrigger courts={courtsList} users={usersList} />
      </div>

      <div className="rounded-[10px] bg-[#f7f7f5] p-5">
        <form
          method="get"
          className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-4"
        >
          <div className="flex items-center gap-2">
            <label htmlFor="desde" className="text-sm font-semibold text-stone-600">
              Desde
            </label>
            <input
              id="desde"
              name="desde"
              type="date"
              defaultValue={desde ?? ''}
              className="min-h-[44px] flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="hasta" className="text-sm font-semibold text-stone-600">
              Hasta
            </label>
            <input
              id="hasta"
              name="hasta"
              type="date"
              defaultValue={hasta ?? ''}
              className="min-h-[44px] flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]"
            />
          </div>
          <button
            type="submit"
            className="min-h-[44px] w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100 md:w-auto"
          >
            Filtrar
          </button>
          {(desde || hasta) && (
            <Link
              href="/admin/reservas"
              className="min-h-[44px] flex w-full items-center justify-center rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100 md:w-auto"
            >
              Quitar filtro
            </Link>
          )}
        </form>

        <AdminReservasContent bookings={bookingsList} desde={desde ?? null} hasta={hasta ?? null} />
      </div>
    </div>
  );
}
