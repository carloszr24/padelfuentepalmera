import { createSupabaseServiceClient } from '@/lib/supabase/server';

export type OpeningForDate = {
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  label: string | null;
};

/**
 * Devuelve el horario de apertura para una fecha (yyyy-mm-dd).
 * Primero busca excepción (fecha única o rango), luego horario semanal.
 */
export async function getOpeningForDate(date: string): Promise<OpeningForDate> {
  const supabase = createSupabaseServiceClient();

  const d = new Date(date + 'T12:00:00');
  const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();

  const { data: exceptions } = await supabase
    .from('schedule_exceptions')
    .select('is_open, open_time, close_time, label, exception_date, end_date')
    .lte('exception_date', date)
    .or(`end_date.is.null,end_date.gte.${date}`)
    .order('exception_date', { ascending: false });

  const exception = (exceptions ?? []).length > 0 ? exceptions![0] : null;

  if (exception) {
    return {
      isOpen: exception.is_open,
      openTime: exception.open_time ? String(exception.open_time).slice(0, 5) : null,
      closeTime: exception.close_time ? String(exception.close_time).slice(0, 5) : null,
      label: exception.label ?? null,
    };
  }

  const { data: weekly } = await supabase
    .from('club_schedule')
    .select('is_open, open_time, close_time')
    .eq('day_of_week', dayOfWeek)
    .single();

  if (!weekly) {
    return { isOpen: false, openTime: null, closeTime: null, label: null };
  }

  return {
    isOpen: weekly.is_open,
    openTime: weekly.open_time ? String(weekly.open_time).slice(0, 5) : null,
    closeTime: weekly.close_time ? String(weekly.close_time).slice(0, 5) : null,
    label: null,
  };
}
