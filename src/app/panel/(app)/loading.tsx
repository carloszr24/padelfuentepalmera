/**
 * Mientras el layout del panel está cargando, no mostramos skeleton (evitar parpadeo de cuadros grises).
 */
export default function PanelAppLoading() {
  return (
    <div className="min-h-[100dvh] w-full bg-[var(--panel-bg)] px-4 pb-8 pt-4 md:mt-16 md:px-12 md:pt-9" aria-hidden />
  );
}
