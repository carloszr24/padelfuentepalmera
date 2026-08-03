import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Registro público sin correo de confirmación de Supabase (evita fallos SMTP).
 * Crea el usuario con email ya confirmado y misma metadata que el trigger de profiles.
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit('register', ip)) {
    return NextResponse.json(
      {
        message:
          'Demasiados intentos de registro desde esta conexión. Espera unos minutos e inténtalo de nuevo.',
      },
      { status: 429 }
    );
  }

  let body: { email?: string; password?: string; full_name?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Solicitud inválida.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const full_name = typeof body.full_name === 'string' ? body.full_name.trim().slice(0, 200) : '';
  const phoneDigits = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';

  if (!phoneDigits || phoneDigits.length !== 9) {
    return NextResponse.json(
      { message: 'El teléfono es obligatorio y debe tener 9 dígitos.' },
      { status: 400 }
    );
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: 'Introduce un email válido.' }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json(
      { message: 'La contraseña debe tener al menos 6 caracteres.' },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServiceClient();

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: full_name || email.split('@')[0],
      phone: phoneDigits,
    },
  });

  if (createError) {
    const msg = createError.message?.toLowerCase() ?? '';
    if (
      msg.includes('already') ||
      msg.includes('registered') ||
      msg.includes('unique') ||
      msg.includes('exists')
    ) {
      return NextResponse.json({ message: 'Ya existe una cuenta con este email.' }, { status: 409 });
    }
    if (
      msg.includes('breach') ||
      msg.includes('pwned') ||
      msg.includes('compromised') ||
      msg.includes('leaked') ||
      msg.includes('data breach')
    ) {
      return NextResponse.json(
        {
          message:
            'Esta contraseña ha aparecido en una filtración de datos. Elige otra más segura (por ejemplo una frase larga o generada por un gestor de contraseñas).',
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: createError.message ?? 'No se ha podido crear la cuenta.' },
      { status: 400 }
    );
  }

  if (!newUser.user?.id) {
    return NextResponse.json({ message: 'No se ha podido crear la cuenta.' }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      full_name: full_name || newUser.user.email?.split('@')[0] || null,
      phone: phoneDigits,
    })
    .eq('id', newUser.user.id);

  if (updateError) {
    console.error('Profile update after register:', updateError);
  }

  return NextResponse.json({ ok: true });
}
