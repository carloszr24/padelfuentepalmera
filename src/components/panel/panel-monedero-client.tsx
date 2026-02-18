'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { PanelMonederoSkeleton } from '@/components/ui/panel-page-skeleton';
import { StripeSuccessCredit } from '@/components/ui/stripe-success-credit';
import { WalletRechargeButton } from '@/components/ui/wallet-recharge-button';
import { usePanelUser } from '@/contexts/panel-user-context';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

const typeLabel: Record<string, string> = {
  recharge: 'Recarga monedero',
  admin_recharge: 'Recarga admin',
  booking_deposit: 'Depósito reserva',
  refund: 'Reembolso',
  late_cancellation: 'Penalización cancelación tardía',
  no_show_penalty: 'Penalización no-show',
  debt_payment: 'Pago de deuda',
};

type TxRow = {
  id: string;
  created_at: string;
  amount: number;
  type: string;
  description: string | null;
};

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type PanelMonederoClientProps = {
  initialTransactions?: TxRow[];
};

export function PanelMonederoClient({ initialTransactions }: PanelMonederoClientProps) {
  const { balance, refreshProfile } = usePanelUser();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<TxRow[] | null>(initialTransactions ?? null);

  const success = searchParams?.get('success') === '1';
  const sessionId = searchParams?.get('session_id') ?? undefined;
  const cancel = searchParams?.get('cancel') === '1';

  // Solo fetch en cliente si no nos pasaron datos iniciales (ej. navegación client-side)
  useEffect(() => {
    if (initialTransactions !== undefined) return;
    let cancelled = false;
    getBrowserSupabaseClient()
      .from('transactions')
      .select('id, created_at, amount, type, description')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!cancelled) setTransactions(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [initialTransactions]);

  if (transactions === null) {
    return <PanelMonederoSkeleton />;
  }

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      {success && sessionId && <StripeSuccessCredit success={true} sessionId={sessionId} onCredited={refreshProfile} />}
      {success && !sessionId && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Pago completado. Si no ves el saldo actualizado, refresca la página.
        </div>
      )}
      {cancel && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Pago cancelado. Puedes recargar cuando quieras.
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader
          breadcrumbs={[{ label: 'Inicio', href: '/panel' }, { label: 'Monedero' }]}
          title="Monedero"
          subtitle="Recarga mínima 10 €. Usa el saldo para pagar el depósito de tus reservas."
        />
        <Link
          href="/panel"
          className="min-h-[44px] inline-flex items-center rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
          prefetch
        >
          Volver al inicio
        </Link>
      </div>

      <div className="grid min-w-0 max-w-full gap-6 md:grid-cols-[1fr,1.2fr]">
        <div className="flex min-h-[140px] min-w-0 flex-col justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Saldo actual</p>
          <p className={`mt-3 text-2xl font-bold ${balance < 0 ? 'text-amber-700' : 'text-stone-900'}`}>
            <span className="whitespace-nowrap">
              {balance < 0 ? '-' : ''}
              {Math.abs(Number(balance)).toFixed(2)} €
            </span>
            {balance < 0 && <span className="ml-2 text-base font-semibold text-amber-700">(deuda)</span>}
          </p>
          {balance < 0 && (
            <p className="mt-1.5 text-sm font-medium text-amber-700">
              Recarga para saldar la deuda y poder reservar de nuevo.
            </p>
          )}
          <p className="mt-1.5 text-[11px] font-medium text-stone-500">Recarga con tarjeta (Stripe). Mínimo 10 €.</p>
          <div className="mt-4">
            <WalletRechargeButton />
          </div>
        </div>

        <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-4 shadow-sm">
          <p className="mb-4 text-xs font-semibold text-stone-500">Historial de movimientos (últimos 30)</p>
          {!transactions.length ? (
            <p className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-sm font-medium text-stone-600">
              Aún no hay movimientos.
            </p>
          ) : (
            <div className="min-w-0 overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-xs font-bold uppercase tracking-wide text-stone-500">
                    <th className="px-4 py-3 align-middle">Descripción</th>
                    <th className="px-4 py-3 align-middle">Fecha</th>
                    <th className="px-4 py-3 align-middle text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-stone-100 transition hover:bg-stone-50">
                      <td className="px-4 py-3 align-middle font-medium text-stone-800">
                        {typeLabel[tx.type] ?? tx.description ?? 'Movimiento'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle text-xs font-medium text-stone-600">
                        {formatDateTime(tx.created_at)}
                      </td>
                      <td className="px-4 py-3 align-middle text-right font-bold tabular-nums">
                        <span
                          className={`whitespace-nowrap ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                        >
                          {tx.amount >= 0 ? '+' : ''}
                          {Number(tx.amount).toFixed(2)} €
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
