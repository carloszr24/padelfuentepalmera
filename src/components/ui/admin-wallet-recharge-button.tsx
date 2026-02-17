'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type AdminWalletRechargeButtonProps = {
  userId: string;
  userName: string;
  /** En tabla compacta: botones en columna y menos padding */
  compact?: boolean;
};

export function AdminWalletRechargeButton({
  userId,
  userName,
  compact = false,
}: AdminWalletRechargeButtonProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | ''>('');
  const [mode, setMode] = useState<'add' | 'subtract'>('add');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const numAmount = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
  const isValid = numAmount > 0;
  const finalAmount = mode === 'subtract' ? -numAmount : numAmount;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      setAmount('');
      setError(null);
      return;
    }
    const parsed = Number(value.replace(',', '.'));
    if (Number.isNaN(parsed)) {
      setError('Introduce un importe válido.');
    } else {
      setAmount(parsed);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValid) {
      setError('Introduce una cantidad mayor que 0.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/wallet/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, amount: finalAmount }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          body?.message ||
            'No se ha podido recargar el monedero. Inténtalo de nuevo.'
        );
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError('Ha ocurrido un error. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const btnClass = compact
    ? 'inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-bold transition'
    : 'min-h-[44px] inline-flex items-center rounded-xl px-3 py-2 text-xs font-bold transition';

  return (
    <>
      <div className={compact ? 'flex flex-col gap-1.5' : 'inline-flex flex-wrap items-center gap-2'}>
        <button
          type="button"
          onClick={() => { setMode('add'); setAmount(''); setError(null); setOpen(true); }}
          className={`${btnClass} border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
        >
          Recargar
        </button>
        <button
          type="button"
          onClick={() => { setMode('subtract'); setAmount(''); setError(null); setOpen(true); }}
          className={`${btnClass} border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100`}
        >
          Restar
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[calc(100vw-32px)] max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  {mode === 'add' ? 'Recargar monedero' : 'Restar del monedero'}
                </h2>
                <p className="mt-1 text-xs font-medium text-stone-600">
                  Usuario: <span className="font-bold">{userName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[44px] min-w-[44px] rounded-full bg-stone-100 px-2 py-1 text-xs font-bold text-stone-600 hover:bg-stone-200"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode('add')} className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${mode === 'add' ? 'border border-emerald-400 bg-emerald-50 text-emerald-700' : 'border border-stone-300 bg-stone-50 text-stone-600 hover:bg-stone-100'}`}>Recargar</button>
                <button type="button" onClick={() => setMode('subtract')} className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${mode === 'subtract' ? 'border border-amber-400 bg-amber-50 text-amber-700' : 'border border-stone-300 bg-stone-50 text-stone-600 hover:bg-stone-100'}`}>Restar</button>
              </div>
              <div className="space-y-1">
                <label htmlFor="amount-admin" className="text-sm font-semibold text-stone-600">Importe (€)</label>
                <div className="relative">
                  <input
                    id="amount-admin"
                    type="text"
                    inputMode="decimal"
                    value={amount === '' ? '' : String(amount)}
                    onChange={handleChange}
                    placeholder={mode === 'add' ? 'Ej. 15' : 'Ej. 5'}
                    className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 pr-12 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/20"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-stone-500">
                    EUR
                  </span>
                </div>
                <p className="text-xs font-medium text-stone-500">{mode === 'add' ? 'Se registrará como recarga admin.' : 'Se descontará del saldo. No puede quedar negativo.'}</p>
              </div>

              {error ? (
                <p className="text-xs font-medium text-red-600">{error}</p>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-end md:gap-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-[44px] w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100 md:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !isValid}
                  className={`min-h-[44px] w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 md:w-auto ${mode === 'add' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'}`}
                >
                  {loading ? 'Aplicando...' : mode === 'add' ? 'Aplicar recarga' : 'Aplicar resta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

