'use client';

import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AuthRegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyHasAccount, setAlreadyHasAccount] = useState(false);

  const PHONE_MAX_LENGTH = 9;
  const phoneDigitsOnly = phone.replace(/\D/g, '');
  const phoneValid = phoneDigitsOnly.length === PHONE_MAX_LENGTH && phoneDigitsOnly.length === phone.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAlreadyHasAccount(false);

    if (!phone.trim()) {
      setError('El teléfono es obligatorio.');
      return;
    }
    if (!phoneValid) {
      setError('El teléfono debe tener 9 dígitos.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    try {
      setLoading(true);
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          full_name: fullName.trim() || undefined,
          phone: phoneDigitsOnly.slice(0, PHONE_MAX_LENGTH),
        }),
      });
      const registerData = (await registerRes.json().catch(() => ({}))) as { message?: string };

      if (registerRes.status === 409) {
        setAlreadyHasAccount(true);
        return;
      }

      if (!registerRes.ok) {
        setError(registerData.message ?? 'No se ha podido crear la cuenta.');
        return;
      }

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
        credentials: 'include',
      });
      const loginData = (await loginRes.json().catch(() => ({}))) as { message?: string };

      if (!loginRes.ok) {
        setError(
          loginData.message ??
            'Cuenta creada, pero no se pudo iniciar sesión automáticamente. Entra en Iniciar sesión con tu email y contraseña.'
        );
        return;
      }

      router.push('/panel');
      router.refresh();
    } catch {
      setError('No se ha podido completar el registro. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (alreadyHasAccount) {
    return (
      <div className="space-y-5 text-sm">
        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        <h2 className="text-center text-xl font-bold text-stone-900">
          Ya tienes una cuenta
        </h2>
        <p className="text-center text-stone-600">
          Este correo ya está registrado. Inicia sesión con tu contraseña o usa &quot;Recuperar contraseña&quot; si no la recuerdas.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-full bg-[#1d4ed8] px-4 py-2.5 text-center text-sm font-bold text-white shadow-lg shadow-[#1d4ed8]/30 hover:bg-[#2563eb]"
        >
          Ir a iniciar sesión
        </Link>
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
          inputMode="numeric"
          autoComplete="tel"
          maxLength={9}
          pattern="[0-9]{0,9}"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
          placeholder="9 dígitos, sin espacio ni +34"
          title="Solo números, máximo 9 dígitos"
        />
        {phone.length > 0 && !phoneValid ? (
          <p className="text-xs font-medium text-red-600">El teléfono debe tener 9 dígitos.</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="text-xs font-bold text-stone-700"
        >
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 pr-10 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
            placeholder="Mínimo 6 caracteres"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="confirmPassword"
          className="text-xs font-bold text-stone-700"
        >
          Confirmar contraseña
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 pr-10 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
            placeholder="Repite la contraseña"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
            aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
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
