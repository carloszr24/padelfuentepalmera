'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export function AuthLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams?.get('password-reset') === 'success') {
      setPasswordResetSuccess(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const supabase = getBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push('/panel');
      router.refresh();
    } catch {
      setError('No se ha podido iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      {passwordResetSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          Contraseña actualizada correctamente. Ya puedes iniciar sesión.
        </div>
      )}
      <div className="space-y-1">
        <label
          htmlFor="email"
          className="text-xs font-bold text-stone-700"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
          placeholder="tu@email.com"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-xs font-bold text-stone-700"
          >
            Contraseña
          </label>
          <Link
            href="/recuperar-contraseña"
            className="text-xs font-semibold text-[#1d4ed8] hover:text-[#1e40af] hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
          placeholder="••••••••"
        />
      </div>

      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-full bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#1d4ed8]/30 hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Entrando...' : 'Iniciar sesión'}
      </button>
    </form>
  );
}

