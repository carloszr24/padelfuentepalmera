import Link from 'next/link';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { AdminMarkRemainingPaidButton } from '@/components/ui/admin-mark-remaining-paid-button';
import { AdminWalletRechargeButton } from '@/components/ui/admin-wallet-recharge-button';

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminUsuarioPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, wallet_balance')
    .eq('id', id)
    .single();

  if (!profile) {
    return (
      <div className="space-y-4">
        <p className="font-medium text-stone-600">Usuario no encontrado.</p>
        <Link href="/admin/usuarios" className="font-bold text-[#1d4ed8] hover:underline">
          Volver a Usuarios
        </Link>
      </div>
    );
  }

  const [
    { data: recharges },
    { data: deposits },
    { data: bookings },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', id)
      .in('type', ['recharge', 'admin_recharge'])
      .gt('amount', 0),
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', id)
      .eq('type', 'booking_deposit'),
    supabase
      .from('bookings')
      .select('id, booking_date, start_time, end_time, status, remaining_paid_at, courts(name)')
      .eq('user_id', id)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false }),
  ]);

  const totalRecargado =
    recharges?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const totalDepositos =
    deposits?.reduce((s, t) => s + Math.abs(Number(t.amount)), 0) ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader
          breadcrumbs={[
            { label: 'Inicio', href: '/admin' },
            { label: 'Usuarios', href: '/admin/usuarios' },
            { label: profile.full_name || profile.email || 'Perfil' },
          ]}
          title={profile.full_name || profile.email || 'Sin nombre'}
          subtitle={profile.email ?? undefined}
        />
        <AdminWalletRechargeButton
          userId={profile.id}
          userName={profile.full_name || profile.email || ''}
        />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Saldo actual</p>
          <p className="admin-number mt-2 text-xl text-[#1a1a1a]"><span className="whitespace-nowrap">{Number(profile.wallet_balance ?? 0).toFixed(2)} €</span></p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Total recargado (histórico)</p>
          <p className="admin-number mt-2 text-xl text-[#059669]"><span className="whitespace-nowrap">+{totalRecargado.toFixed(2)} €</span></p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Total depósitos reservas</p>
          <p className="admin-number mt-2 text-xl text-[#ea580c]"><span className="whitespace-nowrap">−{totalDepositos.toFixed(2)} €</span></p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Reservas</p>
          <p className="admin-number mt-2 text-xl text-[#1a1a1a]">{bookings?.length ?? 0}</p>
        </div>
      </section>

      <section className="rounded-[10px] bg-[#f7f7f5] p-5">
        <h2 className="admin-stat-label mb-1">Reservas de este cliente</h2>
        <p className="mb-4 text-[13px] text-[#6b6b6b]">
          Marca &quot;Resto pagado&quot; cuando en el club se confirme que ha pagado el resto de la pista.
        </p>
        <div className="overflow-x-auto rounded-[10px] bg-white">
          {bookings && bookings.length > 0 ? (
            <ul className="divide-y divide-stone-200">
              {bookings.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-bold text-stone-900">
                      {(Array.isArray(b.courts) ? b.courts[0]?.name : (b.courts as { name?: string } | null)?.name) ?? 'Pista'}
                    </p>
                    <p className="text-xs font-medium text-stone-600">
                      {formatDate(b.booking_date)} · {b.start_time.slice(0, 5)} -{' '}
                      {b.end_time.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                        b.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {b.status === 'confirmed' ? 'Confirmada' : b.status}
                    </span>
                    {b.status === 'confirmed' && (
                      <AdminMarkRemainingPaidButton
                        bookingId={b.id}
                        alreadyPaid={!!b.remaining_paid_at}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm font-medium text-stone-600">
              Aún no tiene reservas.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}
