import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * GET — Buscar usuarios (profiles) por nombre o email.
 * Excluye usuarios que ya son socios. Para modal "Nuevo socio".
 */
export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit('admin', ip)) {
    return NextResponse.json({ message: 'Too Many Requests' }, { status: 429 });
  }
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ message: 'Solo administradores' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().slice(0, 100).replace(/[^\w\s@.\-áéíóúñüÁÉÍÓÚÑÜ]/g, '');

  const service = createSupabaseServiceClient();
  const { data: memberUserIds } = await service.from('members').select('user_id');
  const excludeIds = (memberUserIds ?? []).map((r) => r.user_id);

  let query = service
    .from('profiles')
    .select('id, full_name, email, phone')
    .order('full_name', { ascending: true })
    .limit(20);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.map((id) => `"${id}"`).join(',')})`);
  }
  if (q.length >= 1) {
    const term = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const pattern = `%${term}%`;
    query = query.or(`full_name.ilike."${pattern}",email.ilike."${pattern}",phone.ilike."${pattern}"`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
