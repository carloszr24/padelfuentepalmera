'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export function AuthRegisterForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const supabase = getBrowserSupabaseClient();

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Dependiendo de la configuración de Supabase, puede requerir confirmación de email.
      // De momento redirigimos al panel.
      router.push('/panel');
      router.refresh();
    } catch {
      setError('No se ha podido completar el registro. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <div className="space-y-1">
        <label
          htmlFor="fullName"
          className="text-xs font-bold text-stone-700"
        >
          Nombre completo
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#B5235D] focus:ring-2 focus:ring-[#B5235D]/20"
          placeholder="Tu nombre y apellidos"
        />
      </div>

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
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#B5235D] focus:ring-2 focus:ring-[#B5235D]/20"
          placeholder="tu@email.com"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="text-xs font-bold text-stone-700"
        >
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#B5235D] focus:ring-2 focus:ring-[#B5235D]/20"
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-full bg-[#B5235D] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#B5235D]/30 hover:bg-[#cf2a6c] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  );
}

