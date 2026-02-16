import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey) return response;

  const pathname = request.nextUrl.pathname;
  const isPanelOrAdmin = pathname.startsWith('/panel') || pathname.startsWith('/admin');

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isPanelOrAdmin && user && serviceKey) {
      const adminClient = createClient(url, serviceKey);
      const {
        data: { user: fullUser },
      } = await adminClient.auth.admin.getUserById(user.id);
      const emailConfirmed = fullUser?.email_confirmed_at ?? null;

      if (!emailConfirmed) {
        await supabase.auth.signOut();
        const redirectRes = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.getAll().forEach((c) => {
          redirectRes.cookies.set(c.name, c.value, { path: c.path ?? '/' });
        });
        return redirectRes;
      }
    }
  } catch {
    // Si falla (red, token inválido, etc.), dejamos pasar la request.
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
