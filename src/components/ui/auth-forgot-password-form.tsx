'use client';

import { useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export function AuthForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      setLoading(true);
      const supabase = getBrowserSupabaseClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://padelfuentepalmera-112d-carloszr24s-projects.vercel.app'}/auth/callback`,
      });

      if (resetError) {
        setError(resetError.message || 'Error enviando el email. Revisa la configuración SMTP en Supabase.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('No se ha podido enviar el email. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-bold text-emerald-900">
          Email enviado
        </p>
        <p className="text-xs text-emerald-800">
          Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.
          Revisa tu bandeja de entrada (y spam).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <div className="space-y-1">
        <label
          htmlFor="forgot-email"
          className="text-xs font-bold text-stone-700"
        >
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
          placeholder="tu@email.com"
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
        {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
      </button>
    </form>
  );
}
