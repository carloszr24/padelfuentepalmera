import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { HorariosContent } from '@/components/admin/HorariosContent';

export default function AdminHorariosPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Horarios' }]}
        title="Horarios"
        subtitle="Configura los horarios de apertura del club."
      />
      <HorariosContent />
    </div>
  );
}
