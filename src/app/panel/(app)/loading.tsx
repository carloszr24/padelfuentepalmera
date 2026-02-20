import { PanelPageSkeleton } from '@/components/ui/panel-page-skeleton';

/**
 * Se muestra mientras el layout del panel (getCachedAuth) está cargando.
 * Así el usuario ve un skeleton de inmediato en lugar de pantalla en blanco.
 */
export default function PanelAppLoading() {
  return (
    <div className="min-h-[100dvh] w-full bg-[var(--panel-bg)] px-4 pb-8 pt-4 md:mt-16 md:px-12 md:pt-9">
      <PanelPageSkeleton />
    </div>
  );
}
