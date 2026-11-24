/**
 * Precios de pista. Invariante del club: la señal es la parte de UN jugador y la pista
 * cuesta 4 señales (5 € x 4 = 20 €; tarifa de mañana 3 € x 4 = 12 €). Por eso el "resto"
 * que se paga en el club es siempre 3 señales (15 € / 9 €). Misma regla en el SQL
 * (supabase/court-rest-from-deposit.sql).
 */

export const MEMBER_DEPOSIT_EUR = 4.5;
export const NON_MEMBER_DEPOSIT_EUR = 5;
export const MORNING_DEPOSIT_EUR = 3;

export const PLAYERS_PER_COURT = 4;

/** Desde este día de juego (inclusive) la señal es de 5 € para todos, socios incluidos. */
export const UNIFIED_DEPOSIT_FROM_DATE = '2026-11-01';

/** Tarifa de mañana (lunes a viernes, turnos que empiezan antes de las 14:00). Indefinida desde esta fecha. */
export const MORNING_RATE_FROM_DATE = '2026-11-24';
export const MORNING_RATE_END_TIME = '14:00';

/**
 * Festivos (yyyy-mm-dd): cuentan como fin de semana, sin tarifa de mañana.
 * Añadir aquí cada festivo entre semana (nacionales, autonómicos y locales).
 */
export const RATE_HOLIDAYS: readonly string[] = [
  '2026-12-08',
  '2026-12-25',
  '2027-01-01',
  '2027-01-06',
];

function isoWeekday(date: string): number {
  const w = new Date(`${date}T12:00:00Z`).getUTCDay();
  return w === 0 ? 7 : w;
}

/** true si la reserva (día de juego + hora de inicio) cae en la tarifa de mañana: lunes a viernes, no festivo, antes de las 14:00. */
export function isMorningWeekdayRate(
  bookingDate?: string | null,
  startTime?: string | null
): boolean {
  if (typeof bookingDate !== 'string' || typeof startTime !== 'string') return false;
  const date = bookingDate.slice(0, 10);
  const time = startTime.slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return false;
  if (date < MORNING_RATE_FROM_DATE) return false;
  if (RATE_HOLIDAYS.includes(date)) return false;
  if (isoWeekday(date) > 5) return false;
  return time < MORNING_RATE_END_TIME;
}

export function getExpectedDepositAmount(
  isMember: boolean,
  bookingDate?: string | null,
  startTime?: string | null
): number {
  if (isMorningWeekdayRate(bookingDate, startTime)) return MORNING_DEPOSIT_EUR;
  if (typeof bookingDate === 'string' && bookingDate.slice(0, 10) >= UNIFIED_DEPOSIT_FROM_DATE) {
    return NON_MEMBER_DEPOSIT_EUR;
  }
  return isMember ? MEMBER_DEPOSIT_EUR : NON_MEMBER_DEPOSIT_EUR;
}

/** Precio total de la pista a partir de la señal pagada (4 partes). */
export function getCourtTotalFromDeposit(depositPaid: number): number {
  return depositPaid * PLAYERS_PER_COURT;
}

/** Lo que falta por pagar en el club una vez pagada la señal (las otras 3 partes). */
export function getRestFromDeposit(depositPaid: number): number {
  return depositPaid * (PLAYERS_PER_COURT - 1);
}

export function formatDepositEur(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} €`;
}
