'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemberWithProfile } from '@/app/admin/socios/page';

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isActive(expiryDate: string): boolean {
  return new Date(expiryDate) >= new Date(new Date().toISOString().slice(0, 10));
}

type AdminSociosContentProps = {
  initialMembers: MemberWithProfile[];
  initialSearch?: string;
};

export function AdminSociosContent({ initialMembers, initialSearch }: AdminSociosContentProps) {
  const router = useRouter();
  const [members, setMembers] = useState<MemberWithProfile[]>(initialMembers);
  const [search, setSearch] = useState(initialSearch ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [editMember, setEditMember] = useState<MemberWithProfile | null>(null);
  const [deleteMember, setDeleteMember] = useState<MemberWithProfile | null>(null);

  const refresh = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    router.push(`/admin/socios${params.toString() ? `?${params.toString()}` : ''}`);
  }, [router, search]);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);
  useEffect(() => {
    if (initialSearch !== undefined) setSearch(initialSearch);
  }, [initialSearch]);

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form
          className="flex w-full flex-col gap-3 md:flex-row md:items-center md:gap-4 md:w-auto"
          method="get"
          action="/admin/socios"
        >
          <input
            type="text"
            name="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] md:w-64"
          />
          <button
            type="submit"
            className="min-h-[44px] w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100 md:w-auto"
          >
            Buscar
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold text-stone-500">{members.length} socios en total</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="min-h-[44px] rounded-xl border border-[#1d4ed8] bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1e40af]"
          >
            Nuevo socio
          </button>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white py-16 text-center">
          <p className="text-4xl text-stone-300" aria-hidden>👤</p>
          <p className="mt-4 text-sm font-medium text-stone-600">No hay socios registrados</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-4 min-h-[44px] rounded-xl border border-[#1d4ed8] bg-[#1d4ed8] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#1e40af]"
          >
            Crear primer socio
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs font-bold uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3 align-middle">Nombre</th>
                <th className="px-4 py-3 align-middle">Contacto</th>
                <th className="px-4 py-3 align-middle">Socio desde</th>
                <th className="px-4 py-3 align-middle">Caduca</th>
                <th className="px-4 py-3 align-middle">Estado</th>
                <th className="px-4 py-3 align-middle">Pagado</th>
                <th className="px-4 py-3 align-middle">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const profile = m.profiles;
                const name = profile?.full_name ?? profile?.email ?? '—';
                const contact = profile?.email ?? profile?.phone ?? '—';
                const active = isActive(m.expiry_date);
                return (
                  <tr key={m.id} className="border-b border-stone-100 transition hover:bg-stone-50">
                    <td className="px-4 py-3 align-middle font-bold text-stone-900">{name}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 align-middle text-stone-800">{contact}</td>
                    <td className="px-4 py-3 align-middle font-medium text-stone-800">{formatDate(m.start_date)}</td>
                    <td className="px-4 py-3 align-middle font-medium text-stone-800">{formatDate(m.expiry_date)}</td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {active ? 'Activo' : 'Caducado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          m.is_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {m.is_paid ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditMember(m)}
                          className="rounded-lg border border-stone-300 bg-stone-50 px-2.5 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-stone-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteMember(m)}
                          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <AdminSociosCreateModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            refresh();
          }}
        />
      )}
      {editMember && (
        <AdminSociosEditModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSuccess={() => {
            setEditMember(null);
            refresh();
          }}
        />
      )}
      {deleteMember && (
        <AdminSociosDeleteModal
          member={deleteMember}
          onClose={() => setDeleteMember(null)}
          onSuccess={() => {
            setDeleteMember(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function AdminSociosCreateModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [userLabel, setUserLabel] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isPaid, setIsPaid] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchQ.length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/admin/users/search?q=${encodeURIComponent(searchQ)}`)
        .then((r) => r.json())
        .then((data) => setResults(Array.isArray(data) ? data : []))
        .catch(() => setResults([]));
      debounceRef.current = null;
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!userId) {
      setError('Selecciona un usuario');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, start_date: startDate, is_paid: isPaid }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? 'Error al crear');
        return;
      }
      onSuccess();
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-stone-900">Nuevo socio</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-600">Usuario</label>
            <input
              type="text"
              value={userLabel || searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                if (!e.target.value) setUserId('');
                setUserLabel('');
                setOpenDropdown(true);
              }}
              onFocus={() => searchQ.length >= 2 && setOpenDropdown(true)}
              placeholder="Buscar por nombre o email..."
              className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]"
            />
            {openDropdown && results.length > 0 && (
              <ul className="mt-1 max-h-48 overflow-auto rounded-xl border border-stone-200 bg-white shadow-lg">
                {results.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setUserId(u.id);
                        setUserLabel(u.full_name || u.email || u.id);
                        setSearchQ('');
                        setResults([]);
                        setOpenDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-stone-50"
                    >
                      {u.full_name || u.email} {u.email && u.full_name ? `(${u.email})` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-600">Fecha de alta</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value.slice(0, 10))}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="create-paid"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300"
            />
            <label htmlFor="create-paid" className="text-sm font-semibold text-stone-700">Pagado</label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] flex-1 rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1e40af] disabled:opacity-60"
            >
              {loading ? 'Creando...' : 'Crear socio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminSociosEditModal({
  member,
  onClose,
  onSuccess,
}: {
  member: MemberWithProfile;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [startDate, setStartDate] = useState(member.start_date);
  const [isPaid, setIsPaid] = useState(member.is_paid);
  const [loading, setLoading] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = member.profiles?.full_name ?? member.profiles?.email ?? 'Usuario';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const res = await fetch('/api/admin/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, start_date: startDate, is_paid: isPaid }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? 'Error al guardar');
        return;
      }
      onSuccess();
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!confirm('¿Renovar membresía? Se pondrá fecha de alta = hoy y caducidad = hoy + 1 año.')) return;
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    try {
      setRenewing(true);
      const res = await fetch('/api/admin/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, start_date: today, is_paid: isPaid }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? 'Error al renovar');
        return;
      }
      setStartDate(today);
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      onSuccess();
    } catch {
      setError('Error de conexión');
    } finally {
      setRenewing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-stone-900">Editar socio</h2>
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-600">Usuario</label>
            <p className="mt-1 text-sm font-medium text-stone-900">{name}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-600">Fecha de alta</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value.slice(0, 10))}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8]"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-paid"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300"
            />
            <label htmlFor="edit-paid" className="text-sm font-semibold text-stone-700">Pagado</label>
          </div>
          <button
            type="button"
            onClick={handleRenew}
            disabled={renewing}
            className="min-h-[44px] w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            {renewing ? 'Renovando...' : 'Renovar membresía'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] flex-1 rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1e40af] disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminSociosDeleteModal({
  member,
  onClose,
  onSuccess,
}: {
  member: MemberWithProfile;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const name = member.profiles?.full_name ?? member.profiles?.email ?? 'este usuario';

  const handleDelete = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/members?id=${encodeURIComponent(member.id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.message ?? 'Error al eliminar');
        return;
      }
      onSuccess();
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-stone-900">Eliminar membresía</h2>
        <p className="mt-4 text-sm text-stone-600">
          ¿Estás seguro de eliminar la membresía de <strong>{name}</strong>? El usuario seguirá existiendo en la
          plataforma pero dejará de ser socio.
        </p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="min-h-[44px] flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
