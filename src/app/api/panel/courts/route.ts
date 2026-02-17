import { getCachedAuth } from '@/lib/auth-server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/panel/courts
 * Lista de pistas activas para el modal de reservas (solo usuarios autenticados).
 */
export async function GET() {
  const { user } = await getCachedAuth();
  if (!user) {
    return new Response(null, { status: 401 });
  }
  const service = createSupabaseServiceClient();
  const { data } = await service
    .from('courts')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  const courts = (data ?? []).map((c) => ({ id: String(c.id), name: c.name }));
  return Response.json({ courts });
}
