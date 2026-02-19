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

      <div className="rounded-[10px] bg-[#f7f7f5] p-5">
        <h2 className="admin-stat-label mb-3">Añadir bloque</h2>
        {courtList.length === 0 ? (
          <p className="rounded-[10px] bg-white p-4 text-sm font-medium text-[#6b6b6b]">
            No hay pistas activas. Activa al menos una en Pistas para poder bloquear horarios.
          </p>
        ) : (
          <AdminBlockScheduleForm courts={courtList} />
        )}
      </div>

      <div className="rounded-[10px] bg-[#f7f7f5] p-5">
        <p className="admin-stat-label mb-4">
          {blocks?.length ?? 0} bloques registrados (últimos 100)
        </p>
        {blocks?.length === 0 ? (
          <p className="rounded-[10px] bg-white p-6 text-center text-sm font-medium text-[#6b6b6b]">
            No hay horarios bloqueados. Usa el formulario de arriba para bloquear una franja.
          </p>
        ) : (
          <div className="admin-table-wrap overflow-x-auto rounded-[10px] bg-white">
            <table className="admin-table w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-[#e8e8e4]">
                  <th className="py-3">Pista</th>
                  <th className="py-3">Fecha</th>
                  <th className="py-3">Hora inicio - fin</th>
                  <th className="py-3">Motivo</th>
                  <th className="py-3">Acciones</th>
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
                  courts: { name: string } | { name: string }[] | null;
                }) => {
                  const courtName = Array.isArray(b.courts) ? b.courts[0]?.name : b.courts?.name;
                  return (
                  <tr key={b.id} className="border-b border-[#e8e8e4] transition hover:bg-black/[0.02]">
                    <td className="font-semibold text-[#1a1a1a]">
                      {courtName ?? b.court_id.slice(0, 8)}
                    </td>
                    <td className="font-medium text-[#1a1a1a]">
                      {new Date(b.blocked_date).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="font-medium text-[#1a1a1a]">
                      {String(b.start_time).slice(0, 5)} - {String(b.end_time).slice(0, 5)}
                    </td>
                    <td className="text-[#6b6b6b]">{b.reason ?? '—'}</td>
                    <td>
                      <AdminDeleteBlockButton blockId={b.id} />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4">
          <Link href="/admin/pistas" className="text-sm font-bold text-[#1d4ed8] hover:underline">
            ← Volver a Pistas
          </Link>
        </p>
      </div>
    </div>
  );
}
