'use client';

import dynamic from 'next/dynamic';

const FinanzasContent = dynamic(
  () => import('@/components/admin/FinanzasContent'),
  { ssr: false, loading: () => <p className="py-12 text-center text-stone-500">Cargando finanzas…</p> }
);

export default function AdminFinanzasPage() {
  return <FinanzasContent />;
}
