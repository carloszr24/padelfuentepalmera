'use client';

import Link from 'next/link';
import { useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export function AuthRegisterForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

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
            phone: phone || undefined,
          },
        },
      });

      if (signUpError) {
        const msg = (signUpError.message ?? '').toLowerCase();
        const isLeakedPassword =
          msg.includes('breach') ||
          msg.includes('pwned') ||
          msg.includes('compromised') ||
          msg.includes('leaked') ||
          msg.includes('data breach');
        setError(
          isLeakedPassword
            ? 'Esta contraseña ha aparecido en una filtración de datos. Elige otra más segura (por ejemplo una frase larga o generada por un gestor de contraseñas).'
            : signUpError.message
        );
        return;
      }

      // Cerrar sesión para que no quede logueado hasta que verifique el email.
      await supabase.auth.signOut();
      setRegisteredEmail(email);
    } catch {
      setError('No se ha podido completar el registro. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setResendError(null);
    try {
      setResendLoading(true);
      const supabase = getBrowserSupabaseClient();
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
      });
      if (resendError) {
        setResendError(resendError.message);
        return;
      }
      setResendSent(true);
    } catch {
      setResendError('No se ha podido reenviar. Inténtalo más tarde.');
    } finally {
      setResendLoading(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="space-y-5 text-sm">
        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h2 className="text-center text-xl font-bold text-stone-900">
          ¡Revisa tu correo!
        </h2>
        <p className="text-center text-stone-600">
          Hemos enviado un email de verificación a <strong>{registeredEmail}</strong>. Haz clic en el enlace del correo para activar tu cuenta.
        </p>
        <p className="text-center text-xs text-stone-500">
          Si no lo encuentras, revisa la carpeta de spam.
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || resendSent}
            className="w-full rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
          >
            {resendLoading ? 'Enviando...' : resendSent ? 'Email reenviado' : 'Reenviar email de verificación'}
          </button>
          {resendError && <p className="text-center text-xs text-red-600">{resendError}</p>}
        </div>
        <p className="text-center">
          <Link
            href="/login"
            className="text-sm font-semibold text-[#1d4ed8] hover:text-[#1e40af]"
          >
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    );
  }

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
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
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
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
          placeholder="tu@email.com"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="phone"
          className="text-xs font-bold text-stone-700"
        >
          Teléfono
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
          placeholder="Ej. 600 000 000"
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
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
          placeholder="Mínimo 6 caracteres"
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
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  );
}
