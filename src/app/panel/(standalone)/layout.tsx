import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Layout ligero para rutas que deben cargar muy rápido (ej. /panel/monedero/exito).
 * Solo comprueba sesión con getUser() — sin perfil ni deuda.
 */
export default async function PanelStandaloneLayout({
  children,
}: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      {children}
    </div>
  );
}
