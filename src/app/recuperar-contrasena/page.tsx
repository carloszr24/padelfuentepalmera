import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AuthForgotPasswordForm } from '@/components/ui/auth-forgot-password-form';

export const metadata = {
  title: 'Recuperar contraseña',
  description: 'Restablece tu contraseña de Fuente Palmera Pádel.',
};

type PageProps = {
  searchParams: Promise<{ error?: string }> | { error?: string };
};

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const params = typeof (searchParams as Promise<unknown>).then === 'function'
    ? await (searchParams as Promise<{ error?: string }>)
    : (searchParams as { error?: string });

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/panel');
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 md:px-6 lg:px-8">
        <div className="grid w-full gap-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/80 md:grid-cols-[1.1fr,1fr] md:p-10">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#1d4ed8]">
              Fuente Palmera Padel Club
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
              ¿Olvidaste tu contraseña?
            </h1>
            <p className="text-sm font-medium text-stone-600">
              No te preocupes. Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs font-medium text-stone-600">
              <p className="font-bold text-stone-900">
                ¿Recordaste tu contraseña?
              </p>
              <Link
                href="/login"
                className="mt-2 inline-flex text-xs font-bold text-[#1d4ed8] hover:text-[#1e40af]"
              >
                Volver al inicio de sesión →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
            {(params?.error === 'invalid-token' || params?.error === 'link_expired') && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                {params?.error === 'link_expired'
                  ? 'Este enlace ha caducado (suelen ser válidos 1 hora). Solicita uno nuevo abajo.'
                  : 'El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.'}
              </div>
            )}
            <AuthForgotPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
