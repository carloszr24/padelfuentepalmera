'use client';

import { useState, useEffect } from 'react';

const ACCENT = '#B5235D';
const QUICK_AMOUNTS = [10, 20, 30, 50, 75, 100];
const MIN_EUR = 10;
const MAX_EUR = 500;

type WalletModalProps = {
  open: boolean;
  onClose: () => void;
  trigger?: React.ReactNode;
};

export function WalletModal({ open, onClose, trigger }: WalletModalProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount =
    selectedQuick !== null
      ? selectedQuick
      : (customAmount.trim() ? Number(customAmount) : null);
  const valid = amount !== null && amount >= MIN_EUR && amount <= MAX_EUR;

  useEffect(() => {
    if (!open) {
      setCustomAmount('');
      setSelectedQuick(null);
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Error al crear el pago');
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError('No se recibió la URL de pago');
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  }

  if (!open) {
    return trigger ? <>{trigger}</> : null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900">Recargar monedero</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-4 text-sm font-medium text-stone-600">
          Recarga mínima {MIN_EUR} €. Serás redirigido a Stripe para pagar con tarjeta.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
              Cantidad rápida
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((eur) => (
                <button
                  key={eur}
                  type="button"
                  onClick={() => {
                    setSelectedQuick(eur);
                    setCustomAmount('');
                  }}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${selectedQuick === eur ? 'border-[#B5235D] bg-[#B5235D]/10 text-[#B5235D]' : 'border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}
                >
                  {eur} €
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="wallet-custom" className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">
              O introduce la cantidad
            </label>
            <input
              id="wallet-custom"
              type="number"
              min={MIN_EUR}
              max={MAX_EUR}
              step="1"
              placeholder="Ej. 25"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedQuick(null);
              }}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-[#B5235D] focus:outline-none focus:ring-1 focus:ring-[#B5235D]"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-bold text-stone-700 hover:bg-stone-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!valid || loading}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
            >
              {loading ? 'Redirigiendo…' : `Pagar ${amount != null ? `${amount.toFixed(2)} €` : '—'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
