'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { PanelPageSkeleton } from '@/components/ui/panel-page-skeleton';
import { usePanelUser } from '@/contexts/panel-user-context';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

type BookingRow = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  courts: { name: string } | { name: string }[] | null;
};

export function PanelInicioClient() {
  const { user, displayName, balance } = usePanelUser();
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const supabase = getBrowserSupabaseClient();
    supabase
      .from('bookings')
      .select('id, booking_date, start_time, end_time, status, courts(name)')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .gte('booking_date', new Date().toISOString().slice(0, 10))
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5)
      .then(({ data }) => {
        if (!cancelled) setBookings(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (bookings === null) {
    return <PanelPageSkeleton />;
  }

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Inicio' }]}
        title={`Hola, ${displayName}`}
        subtitle="Aquí puedes ver tus próximas reservas, tu monedero y gestionar tu actividad en el club."
      />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-3">
        <div className="flex min-h-[140px] min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-4 shadow-sm text-center transition hover:border-stone-300 hover:bg-white">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Saldo monedero</p>
          <p className="mt-2 text-2xl font-bold text-stone-900">
            <span className="whitespace-nowrap">{Number(balance).toFixed(2)} €</span>
          </p>
          <Link href="/panel/monedero" className="mt-2 inline-block text-xs font-bold text-[#1d4ed8] hover:text-[#1e40af]" prefetch>
            Recargar →
          </Link>
        </div>
        <div className="flex min-h-[140px] min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-4 shadow-sm text-center transition hover:border-stone-300 hover:bg-white">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Mis reservas</p>
          <p className="mt-2 text-2xl font-bold text-stone-900">{bookings.length}</p>
          <Link href="/panel/reservas" className="mt-2 inline-block text-xs font-bold text-[#1d4ed8] hover:text-[#1e40af]" prefetch>
            Ver todas →
          </Link>
        </div>
        <div className="col-span-2 flex min-h-[140px] min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-4 shadow-sm text-center transition hover:border-stone-300 hover:bg-white lg:col-span-1">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Depósito por reserva</p>
          <p className="mt-2 text-2xl font-bold text-stone-900">
            <span className="whitespace-nowrap">4,50 €</span>
          </p>
          <p className="mt-1 text-xs font-medium text-stone-500">Resto se paga en el club</p>
        </div>
      </section>

      <section className="min-w-0 max-w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800">Próximas reservas</h2>
          <Link
            href="/panel/reservas"
            className="min-h-[44px] inline-flex items-center rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
            prefetch
          >
            Nueva reserva
          </Link>
        </div>
        {!bookings.length ? (
          <p className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-sm font-medium text-stone-600">
            No tienes reservas próximas. Crea una desde Reservas.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <ul className="divide-y divide-stone-200 text-sm">
              {bookings.map((b) => {
                const courtName = Array.isArray(b.courts) ? b.courts[0]?.name : (b.courts as { name?: string } | null)?.name;
                return (
                  <li key={b.id} className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-stone-50">
                    <div>
                      <p className="font-bold text-stone-900">
                        {displayName} · {courtName ?? 'Pista'}
                      </p>
                      <p className="text-[11px] font-medium text-stone-600">
                        {new Date(b.booking_date).toLocaleDateString('es-ES', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                        })}{' '}
                        · {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      Confirmada
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
