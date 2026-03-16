import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { AdminCourtBlocksSection } from '@/components/admin/AdminCourtBlocksSection';

export default async function AdminHorariosBloqueadosPage() {
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
      <AdminCourtBlocksSection />
    </div>
  );
}
