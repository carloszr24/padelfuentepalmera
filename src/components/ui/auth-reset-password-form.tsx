'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export function AuthResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      const supabase = getBrowserSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.push('/login?password-reset=success');
      router.refresh();
    } catch {
      setError('No se ha podido actualizar la contraseña. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <div className="space-y-1">
        <label
          htmlFor="reset-password"
          className="text-xs font-bold text-stone-700"
        >
          Nueva contraseña
        </label>
        <input
          id="reset-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="reset-confirm"
          className="text-xs font-bold text-stone-700"
        >
          Confirmar contraseña
        </label>
        <input
          id="reset-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
          placeholder="Repite la contraseña"
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
        {loading ? 'Actualizando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}
