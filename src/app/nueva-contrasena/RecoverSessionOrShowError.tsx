'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

/**
 * Cuando el usuario llega a /nueva-contrasena con el token en el hash (#access_token=...)
 * el servidor no lo ve. Aquí intentamos setSession desde el hash y recargar.
 */
export function RecoverSessionOrShowError() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'recovered' | 'invalid'>('checking');

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (!hash) {
      setStatus('invalid');
      return;
    }

    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      setStatus('invalid');
      return;
    }

    const run = async () => {
      const supabase = getBrowserSupabaseClient();
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) {
        setStatus('invalid');
        return;
      }
      setStatus('recovered');
      router.replace('/nueva-contrasena');
    };

    run();
  }, [router]);

  if (status === 'checking') {
    return (
      <p className="text-center text-sm text-stone-600">
        Comprobando enlace...
      </p>
    );
  }

  if (status === 'recovered') {
    return (
      <p className="text-center text-sm text-stone-600">
        Redirigiendo...
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
      <p className="text-sm font-medium text-amber-800">
        El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.
      </p>
      <Link
        href="/recuperar-contrasena"
        className="inline-block rounded-full bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white shadow-[#1d4ed8]/30 hover:bg-[#2563eb]"
      >
        Solicitar nuevo enlace
      </Link>
    </div>
  );
}
