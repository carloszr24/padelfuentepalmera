import Link from 'next/link';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { AdminCreateBookingTrigger } from '@/components/ui/admin-create-booking-trigger';
import { AdminReservasContent, type BookingRow } from '@/components/admin/AdminReservasContent';
import { AdminCourtBlocksSection } from '@/components/admin/AdminCourtBlocksSection';
import { RecurringBlocksSection } from '@/components/admin/RecurringBlocksSection';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
};

async function getReservasData(desde: string, hasta: string) {
  const supabase = createSupabaseServiceClient();
  let bookingsQuery = supabase
    .from('bookings')
    .select(
      'id, user_id, booking_date, start_time, end_time, status, deposit_paid, payment_method, remaining_paid_at, pagado_con_bono, profiles!bookings_user_id_fkey(full_name), courts(name)'
    )
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false });
  if (desde) bookingsQuery = bookingsQuery.gte('booking_date', desde);
  if (hasta) bookingsQuery = bookingsQuery.lte('booking_date', hasta);
  const [
    { data: bookings },
    { data: courts },
    { data: profiles },
    { data: recurringBlocks },
    { data: members },
  ] = await Promise.all([
    bookingsQuery,
    supabase.from('courts').select('id, name').eq('is_active', true).order('name'),
    supabase.from('profiles').select('id, full_name, email').order('full_name'),
    supabase.from('recurring_blocks').select('court_id, day_of_week, start_time'),
    supabase.from('members').select('user_id, expiry_date').gte('expiry_date', new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })),
  ]);

  const activeMemberIds = new Set<string>(
    (members ?? [])
      .map((m) => m.user_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  );

  const bookingsList: BookingRow[] = ((bookings ?? []) as BookingRow[]).map((b) => ({
    ...b,
    is_member: !!(b.user_id && activeMemberIds.has(b.user_id)),
  }));

  // Generar reservas técnicas virtuales a partir de bloqueos recurrentes en el rango [desde, hasta]
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  const rangeStart = desde || today;
  const rangeEnd = hasta || today;

  const startDate = new Date(rangeStart + 'T12:00:00');
  const endDate = new Date(rangeEnd + 'T12:00:00');

  const courtNameById = new Map<string, string>();
  (courts ?? []).forEach((c) => {
    if (c.id) courtNameById.set(String(c.id), c.name ?? 'Pista');
  });

  const virtualBlocks: BookingRow[] = [];
  const rb = recurringBlocks ?? [];

  if (rb.length > 0 && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && startDate <= endDate) {
    for (
      let d = new Date(startDate.getTime());
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const bookingDate = d.toISOString().slice(0, 10);
      const dayOfWeek = ((d.getDay() + 6) % 7) + 1; // ISO: lunes=1

      for (const block of rb as Array<{ court_id: string; day_of_week: number; start_time: string }>) {
        if (block.day_of_week !== dayOfWeek) continue;
        const startStr =
          typeof block.start_time === 'string'
            ? block.start_time.slice(0, 5)
            : String(block.start_time).slice(0, 5);

        const [h, m] = startStr.split(':').map((x) => parseInt(x, 10));
        const startMinutes = h * 60 + m;
        const endMinutes = startMinutes + 90;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

        const courtIdStr = String(block.court_id);
        const courtName = courtNameById.get(courtIdStr) ?? 'Pista';

        const id = `rb-${courtIdStr}-${bookingDate}-${startStr}`;

        virtualBlocks.push({
          id,
          user_id: null,
          booking_date: bookingDate,
          start_time: `${startStr}:00`,
          end_time: endStr,
          status: 'blocked',
          deposit_paid: true,
          pagado_con_bono: false,
          payment_method: 'pay_at_club',
          remaining_paid_at: null,
          is_member: false,
          profiles: null,
          courts: { name: courtName },
        });
      }
    }
  }

  const allBookings = bookingsList.concat(virtualBlocks);

  return { bookings: allBookings, courts: courts ?? [], profiles: profiles ?? [] };
}

export default async function AdminReservasPage({ searchParams }: PageProps) {
  const params = await searchParams;

  let desde = params?.desde?.trim().slice(0, 10) ?? '';
  let hasta = params?.hasta?.trim().slice(0, 10) ?? '';

  // Por defecto, mostrar próximas 4 semanas
  if (!desde && !hasta) {
    const now = new Date();
    const todayMadrid = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
    const end = new Date(now);
    end.setDate(end.getDate() + 27); // hoy + 27 días ≈ 4 semanas
    const endMadrid = end.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
    desde = todayMadrid;
    hasta = endMadrid;
  }

  const { bookings, courts, profiles } = await getReservasData(desde, hasta);

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

      <div className="space-y-6">
        <div className="rounded-[10px] bg-[#f7f7f5] p-5">
          <h2 className="admin-stat-label mb-2">Gestión de bloqueos de pistas</h2>
          <p className="mb-4 text-[13px] text-[#6b6b6b]">
            Usa estos bloqueos para que ciertas franjas no aparezcan como disponibles en el panel de reservas de los usuarios.
          </p>
          <AdminCourtBlocksSection showBackToPistasLink={false} />
        </div>

        <RecurringBlocksSection />
      </div>
    </div>
  );
}
