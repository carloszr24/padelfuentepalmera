import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Elimina la cuenta del usuario autenticado (auth.admin.deleteUser).
 * Solo el propio usuario puede eliminar su cuenta.
 */
export async function POST() {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ message: error.message ?? 'Error al eliminar la cuenta' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
