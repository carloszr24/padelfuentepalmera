import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AuthLoginForm } from '@/components/ui/auth-login-form';

export const metadata = {
  title: 'Iniciar sesión',
  description: 'Accede a tu cuenta de Fuente Palmera Pádel para gestionar reservas y monedero.',
};

export default async function LoginPage() {
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
      </div>
    </div>
  );
}

