/** Antelación mínima (minutos) entre "ahora" (Madrid) e inicio de la franja, mismo día. */
export const MIN_BOOKING_LEAD_MINUTES = 25;

export function minutesFromClock(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

/**
 * Para una fecha `yyyy-mm-dd` que coincide con hoy en Madrid, el slot no es reservable
 * si faltan menos de MIN_BOOKING_LEAD_MINUTES hasta su inicio.
 */
export function isSameDayMadridTooSoon(
  date: string,
  todayMadrid: string,
  slotStartHHMM: string,
  nowTimeMadridHHMM: string
): boolean {
  if (date !== todayMadrid) return false;
  const slotM = minutesFromClock(slotStartHHMM);
  const nowM = minutesFromClock(nowTimeMadridHHMM);
  return slotM - nowM < MIN_BOOKING_LEAD_MINUTES;
}
