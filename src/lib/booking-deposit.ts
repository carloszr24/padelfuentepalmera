export const MEMBER_DEPOSIT_EUR = 4.5;
export const NON_MEMBER_DEPOSIT_EUR = 5;

export function getExpectedDepositAmount(isMember: boolean): number {
  return isMember ? MEMBER_DEPOSIT_EUR : NON_MEMBER_DEPOSIT_EUR;
}

export function formatDepositEur(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} €`;
}
