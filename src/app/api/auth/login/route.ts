import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Login con rate limit por IP para mitigar fuerza bruta.
 * Las cookies de sesión las establece Supabase vía createServerSupabaseClient.
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit('login', ip)) {
    return NextResponse.json(
      { message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
      { status: 429 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: 'Cuerpo inválido' },
      { status: 400 }
    );
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json(
      { message: 'Email y contraseña obligatorios' },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    const isUnconfirmed =
      msg.includes('email not confirmed') ||
      (msg.includes('email') && (msg.includes('confirm') || msg.includes('verif')));
    const message = isUnconfirmed
      ? 'Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada (y la carpeta de spam).'
      : error.message;
    return NextResponse.json({ message }, { status: 401 });
  }

  if (!data.session) {
    return NextResponse.json(
      { message: 'No se pudo iniciar sesión' },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
