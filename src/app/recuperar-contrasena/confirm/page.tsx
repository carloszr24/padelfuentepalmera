'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Redirige a la ruta canónica de nueva contraseña (enlaces antiguos del email). */
export default function RecuperarConfirmPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/nueva-contrasena');
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-[#1d4ed8]" />
    </div>
  );
}
