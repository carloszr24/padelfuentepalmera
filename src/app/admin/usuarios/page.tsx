import Link from 'next/link';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { AdminWalletRechargeButton } from '@/components/ui/admin-wallet-recharge-button';

type AdminUsuariosPageProps = {
  searchParams?: Promise<{ q?: string }> | { q?: string };
};

export default async function AdminUsuariosPage({
  searchParams,
}: AdminUsuariosPageProps) {
  const resolved: { q?: string } = typeof (searchParams as Promise<unknown>)?.then === 'function'
    ? await (searchParams as Promise<{ q?: string }>)
    : (searchParams ?? {});
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

  const { data: profiles } = await query;

  const total = profiles?.length ?? 0;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Usuarios' }]}
        title="Usuarios"
        subtitle="Gestiona los usuarios del club: datos, reservas y monedero."
      />

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto" method="get">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Buscar por nombre, email..."
                className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-9 pr-4 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100 sm:w-auto"
            >
              Buscar
            </button>
          </form>
          <p className="text-xs font-semibold text-stone-500">{total} registros en total</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs font-bold uppercase tracking-wider text-stone-500">
                <th className="px-4 py-3 align-middle">Nombre</th>
                <th className="px-4 py-3 align-middle">Contacto</th>
                <th className="px-4 py-3 align-middle">Saldo</th>
                <th className="px-4 py-3 align-middle">Reservas</th>
                <th className="px-4 py-3 align-middle">Acciones</th>
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
            <tr
              key={p.id}
              className="border-b border-stone-100 transition hover:bg-stone-50"
            >
              <td className="px-4 py-3.5 align-middle">
                <p className="font-bold leading-tight text-stone-900">
                  {p.full_name || 'Sin nombre'}
                </p>
                <p className="mt-0.5 max-w-[120px] truncate text-[11px] leading-tight text-stone-500">{p.id.slice(0, 8)}…</p>
              </td>
              <td className="px-4 py-3.5 align-middle font-medium text-stone-800">
                <p className="max-w-[180px] truncate leading-tight">{p.email || '-'}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-stone-500">{p.phone || '-'}</p>
              </td>
              <td className="px-4 py-3.5 align-middle">
                <span className="font-bold tabular-nums text-emerald-600">
                  {Number(p.wallet_balance ?? 0).toFixed(2)} €
                </span>
                {(p as { has_debt?: boolean }).has_debt && (
                  <span className="ml-2 inline-block rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                    Deuda: {Number((p as { debt_amount?: number }).debt_amount ?? 0).toFixed(2).replace('.', ',')} €
                  </span>
                )}
              </td>
              <td className="px-4 py-3.5 align-middle font-medium text-stone-600">
                —
              </td>
              <td className="px-4 py-3.5 align-middle">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/usuarios/${p.id}`}
                    className="rounded-lg border border-[#1d4ed8]/50 bg-[#1d4ed8]/10 px-3 py-1.5 text-xs font-bold text-[#1d4ed8] transition hover:bg-[#1d4ed8]/20"
                  >
                    Ver perfil
                  </Link>
                  <AdminWalletRechargeButton
                    userId={p.id}
                    userName={p.full_name || p.email || 'Usuario'}
                  />
                </div>
              </td>
            </tr>
          )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

