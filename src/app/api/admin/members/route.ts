import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { isValidUUID } from '@/lib/utils';

export type MemberRow = {
  id: string;
  user_id: string;
  start_date: string;
  expiry_date: string;
  is_paid: boolean;
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null;
};

function ensureAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  return async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false as const, status: 401 };
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return { ok: false as const, status: 403 };
    return { ok: true as const, user };
  };
}

/** GET — Lista socios con búsqueda por nombre/email */
export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit('admin', ip)) {
    return NextResponse.json({ message: 'Too Many Requests' }, { status: 429 });
  }
  const supabase = await createServerSupabaseClient();
  const check = await ensureAdmin(supabase)();
  if (!check.ok) return NextResponse.json({ message: 'No autorizado' }, { status: check.status });

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('search') ?? '').trim().slice(0, 100);

  const service = createSupabaseServiceClient();
  let query = service
    .from('members')
    .select('id, user_id, start_date, expiry_date, is_paid, profiles!members_user_id_fkey(full_name, email, phone)')
    .order('expiry_date', { ascending: false });

  if (search.length >= 1) {
    const { data: ids } = await service
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    const userIds = (ids ?? []).map((r) => r.id);
    if (userIds.length === 0) {
      return NextResponse.json([]);
    }
    query = query.in('user_id', userIds);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

/** POST — Crear socio. Body: { user_id, start_date, is_paid } */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit('admin', ip)) {
    return NextResponse.json({ message: 'Too Many Requests' }, { status: 429 });
  }
  const supabase = await createServerSupabaseClient();
  const check = await ensureAdmin(supabase)();
  if (!check.ok) return NextResponse.json({ message: 'No autorizado' }, { status: check.status });

  let body: { user_id?: string; start_date?: string; is_paid?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body inválido' }, { status: 400 });
  }
  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  const startDateRaw = typeof body.start_date === 'string' ? body.start_date.trim().slice(0, 10) : '';
  const isPaid = Boolean(body.is_paid);

  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json({ message: 'user_id obligatorio y válido' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateRaw)) {
    return NextResponse.json({ message: 'start_date obligatorio (YYYY-MM-DD)' }, { status: 400 });
  }

  const startDate = new Date(startDateRaw);
  const expiryDate = new Date(startDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  const expiryStr = expiryDate.toISOString().slice(0, 10);

  const service = createSupabaseServiceClient();
  const { data: existingProfile } = await service.from('profiles').select('id').eq('id', userId).single();
  if (!existingProfile) {
    return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 400 });
  }
  const { data: existingMember } = await service.from('members').select('id').eq('user_id', userId).single();
  if (existingMember) {
    return NextResponse.json({ message: 'Este usuario ya es socio' }, { status: 409 });
  }

  const { data, error } = await service
    .from('members')
    .insert({ user_id: userId, start_date: startDateRaw, expiry_date: expiryStr, is_paid: isPaid })
    .select('id, user_id, start_date, expiry_date, is_paid')
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

/** PUT — Editar socio. Body: { id, start_date?, is_paid? } */
export async function PUT(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit('admin', ip)) {
    return NextResponse.json({ message: 'Too Many Requests' }, { status: 429 });
  }
  const supabase = await createServerSupabaseClient();
  const check = await ensureAdmin(supabase)();
  if (!check.ok) return NextResponse.json({ message: 'No autorizado' }, { status: check.status });

  let body: { id?: string; start_date?: string; is_paid?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body inválido' }, { status: 400 });
  }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id || !isValidUUID(id)) {
    return NextResponse.json({ message: 'id obligatorio y válido' }, { status: 400 });
  }

  const updates: { start_date?: string; expiry_date?: string; is_paid?: boolean } = {};
  if (typeof body.is_paid === 'boolean') updates.is_paid = body.is_paid;
  if (typeof body.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.start_date.trim().slice(0, 10))) {
    const startStr = body.start_date.trim().slice(0, 10);
    const start = new Date(startStr);
    const expiry = new Date(start);
    expiry.setFullYear(expiry.getFullYear() + 1);
    updates.start_date = startStr;
    updates.expiry_date = expiry.toISOString().slice(0, 10);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: 'Nada que actualizar' }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from('members')
    .update(updates)
    .eq('id', id)
    .select('id, user_id, start_date, expiry_date, is_paid')
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

/** DELETE — Eliminar membresía por id */
export async function DELETE(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit('admin', ip)) {
    return NextResponse.json({ message: 'Too Many Requests' }, { status: 429 });
  }
  const supabase = await createServerSupabaseClient();
  const check = await ensureAdmin(supabase)();
  if (!check.ok) return NextResponse.json({ message: 'No autorizado' }, { status: check.status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim() ?? '';
  if (!id || !isValidUUID(id)) {
    return NextResponse.json({ message: 'id obligatorio' }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  const { error } = await service.from('members').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
