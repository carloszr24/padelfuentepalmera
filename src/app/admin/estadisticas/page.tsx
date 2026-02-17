'use client';

import dynamic from 'next/dynamic';

const EstadisticasContent = dynamic(
  () => import('@/components/admin/EstadisticasContent'),
  { ssr: false, loading: () => <p className="py-12 text-center text-stone-500">Cargando estadísticas…</p> }
);

export default function AdminEstadisticasPage() {
  return <EstadisticasContent />;
}
