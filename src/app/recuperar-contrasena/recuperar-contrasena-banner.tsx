'use client';

import { useSearchParams } from 'next/navigation';

export function RecuperarContrasenaBanner() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');

  if (error !== 'invalid-token' && error !== 'link_expired') return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
      {error === 'link_expired'
        ? 'Este enlace ha caducado (suelen ser válidos 1 hora). Solicita uno nuevo abajo.'
        : 'El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.'}
    </div>
  );
}
