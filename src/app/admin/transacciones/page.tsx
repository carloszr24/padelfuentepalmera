import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';

export default async function AdminTransaccionesPage() {
  const supabase = await createServerSupabaseClient();

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, created_at, amount, type, description, profiles!transactions_user_id_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Transacciones' }]}
        title="Transacciones"
        subtitle="Historial de movimientos económicos del sistema."
      />

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold text-stone-500">Últimas 100 transacciones (export hasta 2000)</p>
          <a
            href="/api/admin/transactions/export"
            className="rounded-xl border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100"
            download
          >
            Exportar CSV
          </a>
        </div>
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs font-bold uppercase tracking-wider text-stone-500">
                <th className="px-4 py-3 align-middle">Usuario</th>
                <th className="px-4 py-3 align-middle">Descripción</th>
                <th className="px-4 py-3 align-middle">Fecha</th>
                <th className="px-4 py-3 align-middle text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {transactions?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm font-medium text-stone-500">
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
                    <tr key={tx.id} className="border-b border-stone-100 transition hover:bg-stone-50">
                      <td className="px-4 py-3.5 align-middle font-bold text-stone-900">{name ?? 'Usuario'}</td>
                      <td className="px-4 py-3.5 align-middle font-medium text-stone-800">{tx.description || getTransactionLabel(tx.type)}</td>
                      <td className="px-4 py-3.5 align-middle text-xs font-medium text-stone-600 whitespace-nowrap">{formatDateTime(tx.created_at)}</td>
                      <td className="px-4 py-3.5 align-middle text-right font-bold tabular-nums">
                        <span className={tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}>
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
      return 'Señal reserva';
    case 'refund':
      return 'Reembolso señal';
    default:
      return 'Transacción';
  }
}

