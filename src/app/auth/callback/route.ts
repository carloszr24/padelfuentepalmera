import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = (requestUrl.searchParams.get('type') || 'recovery') as EmailOtpType;

  const origin = requestUrl.origin;

  if (!token_hash) {
    return NextResponse.redirect(`${origin}/recuperar-contrasena?error=invalid-token`);
  }

  const redirectPath =
    type === 'recovery'
      ? '/nueva-contrasena'
      : '/panel';

  const redirectUrl = `${origin}${redirectPath}`;
  const response = NextResponse.redirect(redirectUrl);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value: '', maxAge: 0, ...options });
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  });

  if (error) {
    return NextResponse.redirect(`${origin}/recuperar-contrasena?error=link_expired`);
  }

  return response;
}
