import Link from 'next/link';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { AdminWalletRechargeButton } from '@/components/ui/admin-wallet-recharge-button';
import { AdminCreateUserTrigger } from '@/components/ui/admin-create-user-trigger';

type AdminUsuariosPageProps = {
  searchParams?: Promise<{ q?: string }> | { q?: string };
};

export default async function AdminUsuariosPage({
  searchParams,
}: AdminUsuariosPageProps) {
  const resolved = await (
    typeof (searchParams as Promise<unknown>)?.then === 'function'
      ? (searchParams as Promise<{ q?: string }>)
      : Promise.resolve(searchParams ?? {})
  );
  const raw = (resolved?.q ?? '').trim();
  const q = raw.slice(0, 100).replace(/[^\w\s@.\-áéíóúñüÁÉÍÓÚÑÜ]/g, '');

  const supabase = createSupabaseServiceClient();

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, phone, wallet_balance, has_debt, debt_amount')
    .order('full_name', { ascending: true });

  if (q.length >= 1) {
    const term = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const pattern = `%${term}%`;
    query = query.or(`full_name.ilike."${pattern}",email.ilike."${pattern}",phone.ilike."${pattern}"`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const [profilesRes, membersRes] = await Promise.all([
    query,
    supabase.from('members').select('user_id').gte('expiry_date', today),
  ]);
  const { data: profiles } = profilesRes;
  const activeMemberIds = new Set((membersRes.data ?? []).map((m: { user_id: string }) => m.user_id));

  const total = profiles?.length ?? 0;
  const sociosActivos = activeMemberIds.size;
  const conDeuda = profiles?.filter((p: { has_debt?: boolean }) => p.has_debt).length ?? 0;
  const saldoTotal = profiles?.reduce((s: number, p: { wallet_balance?: number | null }) => s + Number(p.wallet_balance ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>Usuarios</h1>
          <p className="mt-0.5 text-[13px] text-[#6b6b6b]">{total} usuarios registrados</p>
        </div>
        <AdminCreateUserTrigger />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-[10px] bg-[#f7f7f5] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b6b]">Total usuarios</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#2563eb]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>{total}</p>
        </div>
        <div className="rounded-[10px] bg-[#f7f7f5] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b6b]">Socios activos</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#059669]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>{sociosActivos}</p>
        </div>
        <div className="rounded-[10px] bg-[#f7f7f5] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b6b]">Con deuda</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#dc2626]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>{conDeuda}</p>
        </div>
        <div className="rounded-[10px] bg-[#f7f7f5] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b6b6b]">Saldo total</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#ea580c]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>{saldoTotal.toFixed(0)} €</p>
        </div>
      </div>

      <div className="rounded-[14px] border border-[#e8e8e4] bg-[#f7f7f5] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form className="flex w-full flex-col gap-3 md:flex-row md:items-center md:gap-4 md:w-auto" method="get">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Buscar por nombre, email..."
                className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-9 pr-4 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100 md:w-auto"
            >
              Buscar
            </button>
          </form>
          <p className="text-xs font-semibold text-stone-500">{total} registros en total</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#e8e8e4] bg-white">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#e8e8e4] text-[11px] font-bold uppercase tracking-wide text-[#6b6b6b]">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Saldo</th>
                <th className="px-4 py-3">Reservas</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm font-medium text-stone-500">
                    No se han encontrado usuarios.
                  </td>
                </tr>
              ) : (
                profiles?.map((p) => (
                  <tr key={p.id} className="border-b border-[#e8e8e4] transition hover:bg-black/[0.02]">
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#1a1a1a]">{p.full_name || 'Sin nombre'}</span>
                        {activeMemberIds.has(p.id) && (
                          <span className="inline-flex rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#059669]">Socio</span>
                        )}
                        {(p as { has_debt?: boolean }).has_debt && (
                          <span className="inline-flex rounded-full bg-[#fef2f2] px-2 py-0.5 text-[10px] font-bold text-[#dc2626]">Deuda</span>
                        )}
                      </div>
                      <p className="mt-0.5 max-w-[120px] truncate text-[11px] text-stone-500">{p.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="max-w-[180px] truncate font-medium text-[#1a1a1a]">{p.email || '-'}</p>
                      <p className="mt-0.5 text-[12px] text-[#6b6b6b]">{p.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`whitespace-nowrap font-semibold tabular-nums ${(p as { has_debt?: boolean }).has_debt ? 'text-[#dc2626]' : 'text-[#059669]'}`}>
                        {Number(p.wallet_balance ?? 0).toFixed(2).replace('.', ',')} €
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[#6b6b6b]">—</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/admin/usuarios/${p.id}`}
                          className="inline-flex items-center justify-center rounded-md border border-[#e8e8e4] bg-white px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] transition hover:bg-[#f7f7f5] hover:border-[#6b6b6b]"
                        >
                          Perfil
                        </Link>
                        <AdminWalletRechargeButton
                          userId={p.id}
                          userName={p.full_name || p.email || 'Usuario'}
                          compact
                        />
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

