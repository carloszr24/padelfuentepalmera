import Image from 'next/image';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AuthResetPasswordForm } from '@/components/ui/auth-reset-password-form';
import { RecoverSessionOrShowError } from './RecoverSessionOrShowError';

export const metadata = {
  title: 'Establece tu nueva contraseña',
  description: 'Establece tu nueva contraseña de Fuente Palmera Pádel.',
};

export default async function NuevaContrasenaPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-stone-900 text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Fuente Palmera Pádel"
            width={120}
            height={120}
            className="object-contain"
            priority
          />
        </div>
        <div className="mt-8 flex flex-1 flex-col justify-center">
          <h1 className="text-center text-2xl font-bold tracking-tight text-white">
            Establece tu nueva contraseña
          </h1>
          <p className="mt-2 text-center text-sm text-stone-400">
            Mínimo 6 caracteres. Las dos contraseñas deben coincidir.
          </p>
          <div className="mt-6">
            {user ? (
              <div className="rounded-2xl border border-stone-700 bg-stone-800/50 p-6">
                <AuthResetPasswordForm />
              </div>
            ) : (
              <RecoverSessionOrShowError />
            )}
          </div>
          <p className="mt-6 text-center text-xs text-stone-500">
            ¿Recordaste tu contraseña?{' '}
            <Link
              href="/login"
              className="font-bold text-[#B5235D] hover:text-[#d42d6d]"
            >
              Volver al inicio de sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
