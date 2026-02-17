import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Horario club: 10-11:30, 11:30-13:00 | 16:30-18, 18-19:30, 19:30-21, 21-22:30
const SLOT_STARTS = ['10:00', '11:30', '16:30', '18:00', '19:30', '21:00'];

function slotEnd(start: string): string {
  const [h, m] = start.split(':').map(Number);
  let endM = m + 30;
  let endH = h + 1;
  if (endM >= 60) {
    endM -= 60;
    endH += 1;
  }
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function timesOverlap(
  slotStart: string,
  slotEndStr: string,
  startTime: string,
  endTime: string
): boolean {
  const toMins = (t: string) => {
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

  const supabase = createSupabaseServiceClient();

  const [
    { data: bookings },
    { data: blocks },
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

  const now = new Date();
  const todayMadrid = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  const timeMadrid = now.toLocaleTimeString('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const available = SLOT_STARTS.filter((slotStart) => {
    if (date === todayMadrid && slotStart <= timeMadrid) return false;
    const end = slotEnd(slotStart);
    const overlaps = occupied.some((o) =>
      timesOverlap(slotStart, end, o.start, o.end)
    );
    return !overlaps;
  });

  return NextResponse.json({ available });
}
