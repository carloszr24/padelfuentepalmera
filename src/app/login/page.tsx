import { Suspense } from 'react';
import { AuthRedirectIfLoggedIn } from '@/components/auth/auth-redirect-if-logged-in';
import { LoginPageContent } from '@/components/auth/login-page-content';

export const metadata = {
  title: 'Iniciar sesión',
  description: 'Accede a tu cuenta de Fuente Palmera Pádel para gestionar reservas y monedero.',
};

export default function LoginPage() {
  return (
    <AuthRedirectIfLoggedIn>
      <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-stone-100 text-stone-900">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 md:px-6 lg:px-8">
          <Suspense fallback={<div className="h-12" />}>
            <LoginPageContent />
          </Suspense>
        </div>
      </div>
    </AuthRedirectIfLoggedIn>
  );
}
