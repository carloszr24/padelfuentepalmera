import Link from 'next/link';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { AdminBlockScheduleForm } from '@/components/ui/admin-block-schedule-form';
import { AdminDeleteBlockButton } from '@/components/ui/admin-delete-block-button';

export default async function AdminHorariosBloqueadosPage() {
  const supabase = createSupabaseServiceClient();
  const [
    { data: blocks },
    { data: courts },
  ] = await Promise.all([
    supabase
      .from('court_schedules')
      .select('id, court_id, blocked_date, start_time, end_time, reason, courts(name)')
      .order('blocked_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(100),
    supabase.from('courts').select('id, name').eq('is_active', true).order('name'),
  ]);

  const courtList = (courts ?? []).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: 'Inicio', href: '/admin' },
          { label: 'Pistas', href: '/admin/pistas' },
          { label: 'Horarios bloqueados' },
        ]}
        title="Horarios bloqueados"
        subtitle="Franjas en las que una pista no acepta reservas (mantenimiento, eventos, etc.). Añade o elimina bloques desde aquí."
      />

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-800">Añadir bloque</h2>
        {courtList.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm font-medium text-stone-600">
            No hay pistas activas. Activa al menos una en Pistas para poder bloquear horarios.
          </p>
        ) : (
          <AdminBlockScheduleForm courts={courtList} />
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
        <p className="mb-4 text-xs font-semibold text-stone-500">
          {blocks?.length ?? 0} bloques registrados (últimos 100)
        </p>
        {blocks?.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white p-6 text-center text-sm font-medium text-stone-600">
            No hay horarios bloqueados. Usa el formulario de arriba para bloquear una franja.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs font-bold uppercase tracking-wider text-stone-500">
                  <th className="px-4 py-3 align-middle">Pista</th>
                  <th className="px-4 py-3 align-middle">Fecha</th>
                  <th className="px-4 py-3 align-middle">Hora inicio - fin</th>
                  <th className="px-4 py-3 align-middle">Motivo</th>
                  <th className="px-4 py-3 align-middle">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {blocks?.map((b: {
                  id: string;
                  court_id: string;
                  blocked_date: string;
                  start_time: string;
                  end_time: string;
                  reason: string | null;
                  courts: { name: string } | null;
                }) => (
                  <tr key={b.id} className="border-b border-stone-100 transition hover:bg-stone-50">
                    <td className="px-4 py-3.5 align-middle font-bold text-stone-900">
                      {b.courts?.name ?? b.court_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3.5 align-middle font-medium text-stone-800">
                      {new Date(b.blocked_date).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3.5 align-middle font-medium text-stone-800">
                      {String(b.start_time).slice(0, 5)} - {String(b.end_time).slice(0, 5)}
                    </td>
                    <td className="px-4 py-3.5 align-middle text-stone-600">{b.reason ?? '—'}</td>
                    <td className="px-4 py-3.5 align-middle">
                      <AdminDeleteBlockButton blockId={b.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4">
          <Link href="/admin/pistas" className="text-sm font-bold text-[#B5235D] hover:underline">
            ← Volver a Pistas
          </Link>
        </p>
      </div>
    </div>
  );
}
