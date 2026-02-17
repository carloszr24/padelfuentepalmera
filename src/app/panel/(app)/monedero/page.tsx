import { Suspense } from 'react';
import { PanelMonederoClient } from '@/components/panel/panel-monedero-client';
import { PanelMonederoSkeleton } from '@/components/ui/panel-page-skeleton';

export default function PanelMonederoPage() {
  return (
    <Suspense fallback={<PanelMonederoSkeleton />}>
      <PanelMonederoClient />
    </Suspense>
  );
}
