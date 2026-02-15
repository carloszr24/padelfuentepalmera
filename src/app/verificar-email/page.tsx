import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { VerificarEmailClient } from '@/components/ui/verificar-email-client';

export const metadata = {
  title: 'Verifica tu email',
  description: 'Confirma tu correo para activar tu cuenta en Fuente Palmera Pádel.',
};

export default async function VerificarEmailPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const emailConfirmed = (user as { email_confirmed_at?: string | null }).email_confirmed_at;
  if (emailConfirmed) {
    redirect('/panel');
  }

  const email = user.email ?? '';

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 md:px-6 lg:px-8">
        <div className="grid w-full gap-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/80 md:grid-cols-[1.1fr,1fr] md:p-10">
          <div className="space-y-4">
            <div className="flex size-12 flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Fuente Palmera Pádel"
                width={48}
                height={48}
                className="size-full object-contain mix-blend-multiply border-0 shadow-none outline-none ring-0"
              />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#1d4ed8]">
              Fuente Palmera Padel Club
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
              ¡Revisa tu correo!
            </h1>
            <p className="text-sm font-medium text-stone-600">
              Te hemos enviado un email de verificación a <strong>{email}</strong>. Haz clic en el enlace del correo para activar tu cuenta.
            </p>
            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs font-medium text-stone-600">
              <p className="font-bold text-stone-900">
                ¿Ya verificaste?
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
            <p className="mb-4 text-xs font-bold text-stone-700">
              ¿No te llegó el email?
            </p>
            <VerificarEmailClient userEmail={email} />
            <Link
              href="/login"
              className="mt-6 inline-block text-sm font-semibold text-[#1d4ed8] hover:text-[#1e40af]"
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
