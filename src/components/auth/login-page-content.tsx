'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthLoginForm } from '@/components/ui/auth-login-form';

export function LoginPageContent() {
  const searchParams = useSearchParams();
  const showVerifiedBanner = searchParams?.get('verified') === 'true';

  return (
    <>
      {showVerifiedBanner ? (
        <div className="mb-4 w-full max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-800">
          Tu cuenta ha sido verificada. Ya puedes iniciar sesión.
        </div>
      ) : null}
      <div className="grid w-full max-w-6xl gap-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-200/80 md:grid-cols-[1.1fr,1fr] md:p-10">
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#1d4ed8]">
            Fuente Palmera Padel Club
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
            Inicia sesión en tu cuenta
          </h1>
          <p className="text-sm font-medium text-stone-600">
            Accede a tu panel para gestionar reservas, monedero y tus datos de
            jugador.
          </p>
          <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs font-medium text-stone-600">
            <p className="font-bold text-stone-900">
              ¿Todavía no tienes cuenta?
            </p>
            <p className="mt-1">
              Puedes registrarte en menos de un minuto y empezar a reservar
              tus pistas online.
            </p>
            <Link
              href="/registro"
              className="mt-3 inline-flex text-xs font-bold text-[#1d4ed8] hover:text-[#1e40af]"
            >
              Ir al registro →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <AuthLoginForm />
        </div>
      </div>
    </>
  );
}
