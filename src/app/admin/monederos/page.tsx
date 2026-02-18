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
        <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Saldo total en monederos
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-900">
            {totalBalance.toFixed(2)} €
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <p className="mb-4 text-xs font-semibold text-stone-500">{profiles?.length ?? 0} usuarios</p>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs font-bold uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3 align-middle">Usuario</th>
                <th className="px-4 py-3 align-middle">Email</th>
                <th className="px-4 py-3 align-middle text-right">Saldo</th>
                <th className="px-4 py-3 align-middle">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm font-medium text-stone-500">
                    No hay usuarios con monedero.
                  </td>
                </tr>
              ) : (
                profiles?.map((p) => (
                  <tr key={p.id} className="border-b border-stone-100 transition hover:bg-stone-50">
                    <td className="px-4 py-3 align-middle">
                      <p className="font-bold leading-tight text-stone-900">{p.full_name || 'Sin nombre'}</p>
                      <p className="mt-0.5 max-w-[140px] truncate text-[11px] leading-tight text-stone-500">{p.id.slice(0, 8)}…</p>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3.5 align-middle font-medium text-stone-800">{p.email || '-'}</td>
                    <td className="px-4 py-3 align-middle text-right font-bold tabular-nums text-emerald-600">{Number(p.wallet_balance ?? 0).toFixed(2)} €</td>
                    <td className="px-4 py-3 align-middle">
                      <AdminWalletRechargeButton userId={p.id} userName={p.full_name || p.email || 'Usuario'} />
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

