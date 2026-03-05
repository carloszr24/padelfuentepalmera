import { createSupabaseServiceClient } from '@/lib/supabase/server';

export type TimeRange = { openTime: string; closeTime: string };

export type OpeningForDate = {
  isOpen: boolean;
  /** Rangos horarios (mañana y/o tarde). Vacío si cerrado. */
  ranges: TimeRange[];
  label: string | null;
};

function toHHMM(t: string | null): string | null {
  if (!t) return null;
  return String(t).slice(0, 5);
}

/**
 * Devuelve el horario de apertura para una fecha (yyyy-mm-dd).
 * Primero busca excepción (fecha única o rango), luego horario semanal (mañana + tarde).
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
    const ranges: TimeRange[] = [];
    if (exception.is_open && exception.open_time && exception.close_time) {
      ranges.push({
        openTime: toHHMM(exception.open_time)!,
        closeTime: toHHMM(exception.close_time)!,
      });
    }
    return {
      isOpen: exception.is_open,
      ranges,
      label: exception.label ?? null,
    };
  }

  const { data: weekly } = await supabase
    .from('club_schedule')
    .select('is_open, morning_open, morning_close, afternoon_open, afternoon_close')
    .eq('day_of_week', dayOfWeek)
    .single();

  if (!weekly || !weekly.is_open) {
    return { isOpen: false, ranges: [], label: null };
  }

  const ranges: TimeRange[] = [];
  const mOpen = toHHMM(weekly.morning_open);
  const mClose = toHHMM(weekly.morning_close);
  if (mOpen && mClose) {
    ranges.push({ openTime: mOpen, closeTime: mClose });
  }
  const aOpen = toHHMM(weekly.afternoon_open);
  const aClose = toHHMM(weekly.afternoon_close);
  if (aOpen && aClose) {
    ranges.push({ openTime: aOpen, closeTime: aClose });
  }

  return {
    isOpen: ranges.length > 0,
    ranges,
    label: null,
  };
}
