import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { HorariosContent } from '@/components/admin/HorariosContent';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export default async function AdminHorariosPage() {
  const supabase = createSupabaseServiceClient();
  const [
    { data: weeklyRows },
    { data: exceptionRows },
  ] = await Promise.all([
    supabase
      .from('club_schedule')
      .select('day_of_week, is_open, open_time, close_time')
      .order('day_of_week', { ascending: true }),
    supabase
      .from('schedule_exceptions')
      .select('id, exception_date, end_date, is_open, open_time, close_time, label')
      .order('exception_date', { ascending: true }),
  ]);

  const initialWeekly =
    weeklyRows?.length === 7
      ? weeklyRows.map((r) => ({
          day_of_week: r.day_of_week,
          is_open: r.is_open ?? true,
          open_time: r.open_time ? String(r.open_time).slice(0, 5) : null,
          close_time: r.close_time ? String(r.close_time).slice(0, 5) : null,
        }))
      : undefined;
  const initialExceptions = (exceptionRows ?? []).map((e) => ({
    id: e.id,
    exception_date: e.exception_date,
    end_date: e.end_date,
    is_open: e.is_open ?? false,
    open_time: e.open_time ? String(e.open_time).slice(0, 5) : null,
    close_time: e.close_time ? String(e.close_time).slice(0, 5) : null,
    label: e.label,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Horarios' }]}
        title="Horarios"
        subtitle="Configura los horarios de apertura del club."
      />
      <HorariosContent initialWeekly={initialWeekly} initialExceptions={initialExceptions} />
    </div>
  );
}
