export type PaymentStatusBookingInfo = {
  status: string;
  deposit_paid: boolean;
  pagado_con_bono: boolean;
  payment_method?: string | null;
};

/** Etiqueta con el método/estado de pago de una reserva. Compartida entre el listado de reservas y el perfil de usuario. */
export function PaymentStatusBadge({ b }: { b: PaymentStatusBookingInfo }) {
  if (b.status === 'blocked') {
    return (
      <span
        className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ${
          b.deposit_paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }`}
      >
        {b.deposit_paid ? 'Depósito pagado' : 'Depósito pendiente'}
      </span>
    );
  }

  if (b.pagado_con_bono) {
    return (
      <span className="inline-flex w-fit rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-800">
        Bono socio
      </span>
    );
  }

  if (b.deposit_paid) {
    const label =
      b.payment_method === 'wallet'
        ? 'Depósito pagado · Monedero'
        : b.payment_method === 'pay_at_club'
          ? 'Depósito pagado · Club'
          : 'Depósito pagado · Efectivo';
    return (
      <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
        {label}
      </span>
    );
  }

  if (b.payment_method === 'pay_at_club') {
    return (
      <span className="inline-flex w-fit rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-800">
        Pago en club · Señal pendiente
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
      Depósito pendiente
    </span>
  );
}
