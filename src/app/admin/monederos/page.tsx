import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { AdminWalletRechargeButton } from '@/components/ui/admin-wallet-recharge-button';

export default async function AdminMonederosPage() {
  const supabase = createSupabaseServiceClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, wallet_balance')
    .order('full_name', { ascending: true });

  const totalBalance =
    profiles?.reduce(
      (sum, p) => sum + Number(p.wallet_balance ?? 0),
      0
    ) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader
          breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Monederos' }]}
          title="Monederos"
          subtitle="Gestiona el saldo de todos los usuarios. Recarga o resta saldo cuando sea necesario."
        />
        <div className="admin-stat-card flex min-h-[100px] flex-col justify-center text-center">
          <p className="admin-stat-label">Saldo total en monederos</p>
          <p className="admin-number mt-2 text-2xl text-[#1a1a1a] md:text-[26px]">
            {totalBalance.toFixed(2)} €
          </p>
        </div>
      </div>

      <div className="rounded-[10px] bg-[#f7f7f5] p-5">
        <p className="admin-stat-label mb-4">{profiles?.length ?? 0} usuarios</p>
        <div className="admin-table-wrap overflow-x-auto rounded-[10px] bg-white">
          <table className="admin-table w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#e8e8e4]">
                <th className="py-3">Usuario</th>
                <th className="py-3">Email</th>
                <th className="py-3 text-right">Saldo</th>
                <th className="py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm font-medium text-[#6b6b6b]">
                    No hay usuarios con monedero.
                  </td>
                </tr>
              ) : (
                profiles?.map((p) => (
                  <tr key={p.id} className="border-b border-[#e8e8e4] transition hover:bg-black/[0.02]">
                    <td>
                      <p className="font-semibold leading-tight text-[#1a1a1a]">{p.full_name || 'Sin nombre'}</p>
                      <p className="mt-0.5 max-w-[140px] truncate text-[11px] text-[#6b6b6b]">{p.id.slice(0, 8)}…</p>
                    </td>
                    <td className="max-w-[200px] truncate font-medium text-[#1a1a1a]">{p.email || '-'}</td>
                    <td className="text-right tabular-nums">
                      <span className="admin-amount-positive whitespace-nowrap" style={{ fontFamily: 'var(--font-space-grotesk)' }}>{Number(p.wallet_balance ?? 0).toFixed(2)} €</span>
                    </td>
                    <td>
                      <div className="admin-action-group">
                        <AdminWalletRechargeButton userId={p.id} userName={p.full_name || p.email || 'Usuario'} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

