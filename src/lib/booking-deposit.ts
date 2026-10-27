export const MEMBER_DEPOSIT_EUR = 4.5;
export const NON_MEMBER_DEPOSIT_EUR = 5;

/** Desde este día de juego (inclusive) la señal es de 5 € para todos, socios incluidos. */
export const UNIFIED_DEPOSIT_FROM_DATE = '2026-11-01';

export function getExpectedDepositAmount(isMember: boolean, bookingDate?: string | null): number {
  if (bookingDate && bookingDate.slice(0, 10) >= UNIFIED_DEPOSIT_FROM_DATE) {
    return NON_MEMBER_DEPOSIT_EUR;
  }
  return isMember ? MEMBER_DEPOSIT_EUR : NON_MEMBER_DEPOSIT_EUR;
}

export function formatDepositEur(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} €`;
}
