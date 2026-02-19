'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PanelMonederoSkeleton } from '@/components/ui/panel-page-skeleton';
import { StripeSuccessCredit } from '@/components/ui/stripe-success-credit';
import { WalletRechargeButton } from '@/components/ui/wallet-recharge-button';
import { usePanelUser } from '@/contexts/panel-user-context';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

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

function getMovementLabel(tx: TxRow): string {
  if (tx.description?.trim()) return tx.description;
  const labels: Record<string, string> = {
    recharge: 'Recarga monedero',
    admin_recharge: 'Recarga admin',
    booking_deposit: 'Depósito reserva',
    refund: 'Reembolso',
    late_cancellation: 'Penalización cancelación tardía',
    no_show_penalty: 'Penalización no-show',
    debt_payment: 'Pago de deuda',
  };
  return labels[tx.type] ?? 'Movimiento';
}

type PanelMonederoClientProps = {
  initialTransactions?: TxRow[] | null;
};

export function PanelMonederoClient({ initialTransactions }: PanelMonederoClientProps) {
  const { balance, refreshProfile } = usePanelUser();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<TxRow[] | null>(initialTransactions ?? null);

  const success = searchParams?.get('success') === '1';
  const sessionId = searchParams?.get('session_id') ?? undefined;
  const cancel = searchParams?.get('cancel') === '1';

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

  const cardClass = 'rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-card)] p-6 shadow-[var(--panel-shadow-sm)] transition-all duration-250 hover:shadow-[var(--panel-shadow-md)] hover:-translate-y-0.5';
  const labelClass = 'text-[11px] font-semibold uppercase tracking-widest text-[var(--panel-text-secondary)]';

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      {success && sessionId && <StripeSuccessCredit success={true} sessionId={sessionId} onCredited={refreshProfile} />}
      {success && !sessionId && (
        <div className="rounded-[var(--panel-radius)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Pago completado. Si no ves el saldo actualizado, refresca la página.
        </div>
      )}
      {cancel && (
        <div className="rounded-[var(--panel-radius)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Pago cancelado. Puedes recargar cuando quieras.
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-bold tracking-tight text-[var(--panel-text)]" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '24px' }}>
            Monedero
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--panel-text-secondary)]">
            Recarga mínima 10 €. Usa el saldo para pagar el depósito de tus reservas.
          </p>
        </div>
        <Link href="/panel" className="rounded-lg border border-[var(--panel-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--panel-text)] hover:bg-[var(--panel-bg)]" prefetch>
          Volver al inicio
        </Link>
      </div>

      <div className="grid min-w-0 max-w-full gap-6 md:grid-cols-[1fr,1.2fr]">
        <div className={`${cardClass} relative overflow-hidden`}>
          <div className="absolute -right-10 -top-10 h-[120px] w-[120px] rounded-full opacity-60" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02))' }} />
          <p className={labelClass}>Saldo actual</p>
          <p className={`mt-3 font-bold tracking-tight ${balance < 0 ? 'text-amber-700' : 'text-[var(--panel-text)]'}`} style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '36px' }}>
            {balance < 0 ? '-' : ''}{Math.abs(Number(balance)).toFixed(2).replace('.', ',')} <span className="text-[22px] font-medium text-[var(--panel-text-secondary)]">€</span>
          </p>
          {balance < 0 && (
            <p className="mt-1.5 text-sm font-medium text-amber-700">
              Recarga para saldar la deuda y poder reservar de nuevo.
            </p>
          )}
          <p className="mt-1.5 text-[11px] font-medium text-[var(--panel-text-secondary)]">Recarga con tarjeta (Stripe). Mínimo 10 €.</p>
          <div className="mt-4">
            <WalletRechargeButton />
          </div>
        </div>

        <div className={cardClass}>
          <p className={`mb-4 ${labelClass}`}>Historial de movimientos (últimos 30)</p>
          {!transactions.length ? (
            <p className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-8 text-center text-sm font-medium text-[var(--panel-text-secondary)]">
              Aún no hay movimientos.
            </p>
          ) : (
            <>
              <div className="hidden min-w-0 overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-[var(--panel-border)] text-[11px] font-bold uppercase tracking-wide text-[var(--panel-text-secondary)]">
                      <th className="py-3">Descripción</th>
                      <th className="py-3">Fecha</th>
                      <th className="py-3 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-[var(--panel-border)] transition hover:bg-black/[0.02]">
                        <td className="py-3 font-medium text-[var(--panel-text)]">{getMovementLabel(tx)}</td>
                        <td className="whitespace-nowrap py-3 text-xs text-[var(--panel-text-secondary)]">{formatDateTime(tx.created_at)}</td>
                        <td className="py-3 text-right font-semibold tabular-nums" style={{ fontFamily: 'var(--font-space-grotesk)', color: tx.amount >= 0 ? 'var(--panel-green)' : 'var(--panel-red)' }}>
                          {tx.amount >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2).replace('.', ',')} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 md:hidden">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-[12px] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--panel-text)]">{getMovementLabel(tx)}</p>
                      <p className="text-xs text-[var(--panel-text-secondary)]">{formatDateTime(tx.created_at)}</p>
                    </div>
                    <span className="font-bold tabular-nums" style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '15px', color: tx.amount >= 0 ? 'var(--panel-green)' : 'var(--panel-red)' }}>
                      {tx.amount >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
