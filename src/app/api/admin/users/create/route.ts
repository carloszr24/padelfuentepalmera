import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabaseAuth.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  const { data: profile } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ message: 'Solo administradores' }, { status: 403 });
  }

  let body: { email?: string; password?: string; full_name?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body inválido' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const full_name = typeof body.full_name === 'string' ? body.full_name.trim().slice(0, 200) : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 50) : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: 'Email obligatorio y válido' }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ message: 'Contraseña obligatoria (mínimo 6 caracteres)' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: full_name || email.split('@')[0],
      phone: phone || undefined,
    },
  });

  if (createError) {
    const msg = createError.message?.toLowerCase() ?? '';
    if (msg.includes('already') || msg.includes('ya existe')) {
      return NextResponse.json({ message: 'Ya existe un usuario con ese email' }, { status: 409 });
    }
    return NextResponse.json({ message: createError.message ?? 'Error al crear usuario' }, { status: 400 });
  }

  if (!newUser.user?.id) {
    return NextResponse.json({ message: 'Error al crear usuario' }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      full_name: full_name || newUser.user.email?.split('@')[0] || null,
      phone: phone || null,
    })
    .eq('id', newUser.user.id);

  if (updateError) {
    console.error('Profile update after create:', updateError);
  }

  return NextResponse.json({
    id: newUser.user.id,
    email: newUser.user.email,
    message: 'Usuario creado. Puede iniciar sesión con su email y contraseña.',
  });
}
