import { redirect } from 'next/navigation';
import { PanelReservasClient } from '@/components/panel/panel-reservas-client';
import { getCachedAuth } from '@/lib/auth-server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export default async function PanelReservasPage() {
  const { user } = await getCachedAuth();
  if (!user) redirect('/login');

  const service = createSupabaseServiceClient();
  const [courtsRes, bookingsRes] = await Promise.all([
    service.from('courts').select('id, name').eq('is_active', true).order('name'),
    service
      .from('bookings')
      .select('id, booking_date, start_time, end_time, status, deposit_paid, courts(name)')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false }),
  ]);

  const courts = (courtsRes.data ?? []).map((c) => ({ id: String(c.id), name: c.name ?? '' }));
  const bookings = (bookingsRes.data ?? []) as {
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: string;
    deposit_paid: boolean;
    courts: { name: string } | { name: string }[] | null;
  }[];

  return <PanelReservasClient initialCourts={courts} initialBookings={bookings} />;
}
