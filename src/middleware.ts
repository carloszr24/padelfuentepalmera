import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    });

    await supabase.auth.getUser();
  } catch {
    // Si falla, dejamos pasar (p. ej. /auth/callback, /nueva-contrasena siguen siendo accesibles).
  }

  return response;
}

export const config = {
  matcher: [
    // Refrescar sesión en todas las rutas excepto estáticos y API.
    // /auth/callback y /nueva-contrasena tienen acceso público (no redirigimos).
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
