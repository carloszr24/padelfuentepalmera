import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';

export default async function AdminTransaccionesPage() {
  const supabase = createSupabaseServiceClient();

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, created_at, amount, type, description, profiles!transactions_user_id_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Transacciones' }]}
        title="Transacciones"
        subtitle="Historial de movimientos económicos del sistema."
      />

      <div className="rounded-[10px] bg-[#f7f7f5] p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b6b]">Últimas 100 transacciones (export hasta 2000)</p>
          <a
            href="/api/admin/transactions/export"
            className="admin-btn inline-flex items-center border border-[#e8e8e4] bg-white px-3 py-1.5 text-[#1a1a1a] transition hover:bg-[#f7f7f5]"
            download
          >
            Exportar CSV
          </a>
        </div>
        <div className="admin-table-wrap overflow-x-auto rounded-[10px] bg-white">
          <table className="admin-table w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#e8e8e4]">
                <th className="py-3">Usuario</th>
                <th className="py-3">Descripción</th>
                <th className="py-3">Fecha</th>
                <th className="py-3 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {transactions?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm font-medium text-[#6b6b6b]">
                    No hay transacciones registradas todavía.
                  </td>
                </tr>
              ) : (
                transactions?.map((tx) => {
                  const profile = tx.profiles;
                  const name = typeof profile === 'object' && profile !== null && 'full_name' in profile
                    ? (profile as { full_name: string | null }).full_name
                    : null;
                  return (
                    <tr key={tx.id} className="border-b border-[#e8e8e4] transition hover:bg-black/[0.02]">
                      <td className="font-semibold text-[#1a1a1a]">{name ?? 'Usuario'}</td>
                      <td className="font-medium text-[#1a1a1a]">{tx.description || getTransactionLabel(tx.type)}</td>
                      <td className="whitespace-nowrap text-xs text-[#6b6b6b]">{formatDateTime(tx.created_at)}</td>
                      <td className="text-right tabular-nums">
                        <span className={`whitespace-nowrap ${tx.amount >= 0 ? 'admin-amount-positive' : 'font-semibold text-[#dc2626]'}`} style={tx.amount >= 0 ? { fontFamily: 'var(--font-space-grotesk)' } : undefined}>
                          {tx.amount >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2)} €
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTransactionLabel(
  type: 'recharge' | 'booking_deposit' | 'admin_recharge' | 'refund'
): string {
  switch (type) {
    case 'recharge':
      return 'Recarga monedero';
    case 'admin_recharge':
      return 'Recarga admin';
    case 'booking_deposit':
      return 'Depósito reserva';
    case 'refund':
      return 'Reembolso depósito';
    default:
      return 'Transacción';
  }
}

