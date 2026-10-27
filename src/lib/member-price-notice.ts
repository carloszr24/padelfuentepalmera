import { toMadridDateString } from '@/lib/booking-lead-time';

/** Último día (inclusive) en que se muestra el aviso del cambio de señal para socios. */
export const MEMBER_PRICE_NOTICE_UNTIL = '2026-11-08';

export const MEMBER_PRICE_NOTICE_TITLE = 'Aviso para socios';

export const MEMBER_PRICE_NOTICE_MESSAGE =
  'A partir del 1 de noviembre, la señal de cada pista para socios pasa de 4,50 € a 5 €. Las reservas para jugar hasta el 31 de octubre mantienen los 4,50 €.';

export function isMemberPriceNoticeActive(now: Date = new Date()): boolean {
  return toMadridDateString(now) <= MEMBER_PRICE_NOTICE_UNTIL;
}
