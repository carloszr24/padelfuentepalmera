import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { getOpeningForDate } from '@/lib/club-schedule';
import { isSameDayMadridTooSoon } from '@/lib/booking-lead-time';

// Orden de filtrado (imposible reservar fuera de horario):
// 1. club_schedule (getOpeningForDate): si is_open=false → ningún slot; si true → solo slots entre open_time y close_time (sesión termina antes de cierre).
// 2. schedule_exceptions: getOpeningForDate ya aplica excepciones (festivos, cierres puntuales) sobre el horario semanal.
// 3. recurring_blocks: franjas bloqueadas semanalmente por pista → se eliminan.
// 4. court_schedules + bookings: reservas y bloqueos puntuales → lo que queda es lo disponible.

// Horarios fijos por día: solo estos slots existen. day_of_week 1 = Lunes, 7 = Domingo.
const SLOTS_WEEKDAY = ['09:30', '11:00', '12:30', '16:30', '18:00', '19:30', '21:00'] as const; // Lunes–Viernes (mañana + tardes). Última 21:00, cierre 22:30
const SLOTS_WEEKEND = ['09:30', '11:00', '12:30', '14:00', '16:30', '18:00', '19:30', '21:00'] as const; // Sábado–Domingo. Última 21:00

function getSlotStartsForDay(dayOfWeek: number): readonly string[] {
  return dayOfWeek >= 1 && dayOfWeek <= 5 ? SLOTS_WEEKDAY : SLOTS_WEEKEND;
}

// Duración reserva: 90 minutos (pádel)
function slotEnd(start: string, durationMinutes = 90): string {
  const [h, m] = start.split(':').map(Number);
  const totalMins = h * 60 + m + durationMinutes;
  if (totalMins >= 24 * 60) return '24:00'; // fin de día para solapamientos
  const endH = Math.floor(totalMins / 60);
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function timesOverlap(
  slotStart: string,
  slotEndStr: string,
  startTime: string,
  endTime: string
): boolean {
  const toMins = (t: string) => {
    if (t === '24:00') return 24 * 60;
    const [h, m] = t.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  };
  const s1 = toMins(slotStart);
  const e1 = toMins(slotEndStr);
  const s2 = toMins(startTime);
  const e2 = toMins(endTime);
  return s1 < e2 && e1 > s2;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courtId = searchParams.get('courtId');
  const date = searchParams.get('date');

  if (!courtId || !date) {
    return NextResponse.json(
      { message: 'Faltan courtId o date (yyyy-mm-dd)' },
      { status: 400 }
    );
  }

  const sessionSupabase = await createServerSupabaseClient();
  const {
    data: { user: sessionUser },
  } = await sessionSupabase.auth.getUser();
  let isAdmin = false;
  if (sessionUser) {
    const { data: profile } = await sessionSupabase
      .from('profiles')
      .select('role')
      .eq('id', sessionUser.id)
      .maybeSingle();
    isAdmin = profile?.role === 'admin';
  }

  const supabase = createSupabaseServiceClient();

  // day_of_week: 1 = Lunes, 7 = Domingo (ISO)
  const d = new Date(date + 'T12:00:00');
  const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();

  const [
    { data: bookings },
    { data: blocks },
    { data: recurringBlocks },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('court_id', courtId)
      .eq('booking_date', date)
      .in('status', ['confirmed', 'completed']),
    supabase
      .from('court_schedules')
      .select('start_time, end_time')
      .eq('court_id', courtId)
      .eq('blocked_date', date),
    supabase
      .from('recurring_blocks')
      .select('start_time')
      .eq('court_id', courtId)
      .eq('day_of_week', dayOfWeek),
  ]);

  const occupied: { start: string; end: string }[] = [];
  for (const b of bookings ?? []) {
    occupied.push({
      start: b.start_time?.slice(0, 5) ?? '00:00',
      end: b.end_time?.slice(0, 5) ?? '00:00',
    });
  }
  for (const b of blocks ?? []) {
    occupied.push({
      start: b.start_time?.slice(0, 5) ?? '00:00',
      end: b.end_time?.slice(0, 5) ?? '00:00',
    });
  }
  for (const b of recurringBlocks ?? []) {
    const start = String(b.start_time).slice(0, 5);
    occupied.push({
      start,
      end: slotEnd(start),
    });
  }

  const opening = await getOpeningForDate(date);
  if (!opening.isOpen || opening.ranges.length === 0) {
    return NextResponse.json({ available: [], closed: true, label: opening.label ?? undefined });
  }

  let slotStarts = getSlotStartsForDay(dayOfWeek);

  // Respetar horario del club (mañana y/o tarde): slot debe caber entero en algún rango
  const toMins = (t: string) => {
    const [h, m] = t.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  };
  slotStarts = slotStarts.filter((start) => {
    const startMins = toMins(start);
    const endMins = toMins(slotEnd(start));
    return opening.ranges.some((r) => {
      const openMins = toMins(r.openTime);
      const closeMins = toMins(r.closeTime);
      return startMins >= openMins && endMins <= closeMins;
    });
  });

  const now = new Date();
  const todayMadrid = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  const timeMadrid = now.toLocaleTimeString('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const available = slotStarts.filter((slotStart) => {
    if (date === todayMadrid) {
      if (isAdmin) {
        if (slotStart <= timeMadrid) return false;
      } else if (isSameDayMadridTooSoon(date, todayMadrid, slotStart, timeMadrid)) {
        return false;
      }
    }
    const end = slotEnd(slotStart);
    const overlaps = occupied.some((o) =>
      timesOverlap(slotStart, end, o.start, o.end)
    );
    return !overlaps;
  });

  return NextResponse.json({ available, closed: false });
}
