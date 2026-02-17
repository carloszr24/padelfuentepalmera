'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { AuthResetPasswordForm } from '@/components/ui/auth-reset-password-form';
import { RecoverSessionOrShowError } from './RecoverSessionOrShowError';

export function NuevaContrasenaContent() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    getBrowserSupabaseClient()
      .auth.getSession()
      .then(({ data: { session } }) => setHasSession(!!session?.user));
  }, []);

  if (hasSession === null) {
    return (
      <p className="text-center text-sm text-stone-600">
        Cargando...
      </p>
    );
  }

  return hasSession ? <AuthResetPasswordForm /> : <RecoverSessionOrShowError />;
}
