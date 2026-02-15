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

  // Si no hay usuario (no acaba de registrarse), ir a login
  if (!user) {
    redirect('/login');
  }

  // Si ya confirmó el email, ir al panel
  const emailConfirmed = (user as { email_confirmed_at?: string | null }).email_confirmed_at;
  if (emailConfirmed) {
    redirect('/panel');
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4 md:px-6">
        <div className="w-full rounded-3xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-200/80">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#1d4ed8]">
            Fuente Palmera Padel Club
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-900">
            Verifica tu email
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            Te hemos enviado un email de verificación a <strong>{user.email}</strong>. Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
          </p>
          <p className="mt-2 text-xs text-stone-500">
            Si no lo ves, revisa la carpeta de spam.
          </p>
          <div className="mt-8">
            <VerificarEmailClient userEmail={user.email ?? ''} />
          </div>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-semibold text-[#1d4ed8] hover:text-[#1e40af]"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
