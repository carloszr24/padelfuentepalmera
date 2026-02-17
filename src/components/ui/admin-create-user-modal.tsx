'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AdminCreateUserModal({ open, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Introduce un email válido.');
      return;
    }
    if (!password || password.length < 6) {
      setError('La contraseña es obligatoria (mínimo 6 caracteres).');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          full_name: trimmedName || undefined,
          phone: trimmedPhone || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? 'No se pudo crear el usuario.');
        return;
      }
      setEmail('');
      setPassword('');
      setFullName('');
      setPhone('');
      onClose();
      router.refresh();
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[calc(100vw-32px)] max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-stone-900">Crear nuevo cliente</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full bg-stone-100 px-2 py-1 text-xs font-bold text-stone-600 hover:bg-stone-200"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label htmlFor="create-user-email" className="mb-1 block font-semibold text-stone-600">Email *</label>
            <input
              id="create-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@ejemplo.com"
              className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              required
            />
          </div>
          <div>
            <label htmlFor="create-user-password" className="mb-1 block font-semibold text-stone-600">Contraseña *</label>
            <input
              id="create-user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
              required
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="create-user-name" className="mb-1 block font-semibold text-stone-600">Nombre completo</label>
            <input
              id="create-user-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Opcional"
              className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
            />
          </div>
          <div>
            <label htmlFor="create-user-phone" className="mb-1 block font-semibold text-stone-600">Teléfono</label>
            <input
              id="create-user-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Opcional"
              className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
            />
          </div>

          {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-end md:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100 md:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] w-full rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]/90 disabled:opacity-60 md:w-auto"
            >
              {loading ? 'Creando...' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
