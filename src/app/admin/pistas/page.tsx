import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { AdminCourtCard } from '@/components/ui/admin-court-card';

export default async function AdminPistasPage() {
  const supabase = createSupabaseServiceClient();

  const { data: courts } = await supabase
    .from('courts')
    .select('id, name, type, is_active')
    .order('name', { ascending: true });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Pistas' }]}
        title="Pistas"
        subtitle="Activa o desactiva pistas y gestiona sus horarios bloqueados."
      />

      <div className="rounded-[10px] bg-[#f7f7f5] p-5">
        <p className="admin-stat-label mb-4">{courts?.length ?? 0} pistas</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courts?.map((court) => (
            <AdminCourtCard
              key={court.id}
              id={court.id}
              name={court.name}
              type={court.type}
              isActive={court.is_active}
            />
          ))}
        </div>
        {courts?.length === 0 && (
          <p className="py-12 text-center text-sm font-medium text-[#6b6b6b]">
            No hay pistas creadas todavía.
          </p>
        )}
      </div>
    </div>
  );
}

