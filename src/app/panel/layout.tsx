import type { ReactNode } from 'react';

/**
 * Layout raíz del panel. No hace auth aquí: lo hace (app)/layout o (standalone)/layout
 * según la ruta, para que /panel/monedero/exito cargue con auth mínimo (solo getUser).
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
