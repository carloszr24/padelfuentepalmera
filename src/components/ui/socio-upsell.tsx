'use client';

import { useState } from 'react';

const MEMBERSHIP_FEE = 15;

type SocioUpsellProps = {
  /** Si true, muestra el botón de pago directo. Si false, muestra un botón que navega a /panel/membresia */
  showPayButton?: boolean;
  /** Texto personalizable del CTA secundario */
  ctaLabel?: string;
  onCtaClick?: () => void;
};

export function SocioUpsell({ showPayButton = false, ctaLabel, onCtaClick }: SocioUpsellProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ceca/create-membership-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: typeof window !== 'undefined' ? window.location.origin : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        setLoading(false);
        return;
      }
      if (data.formAction && data.formFields && typeof data.formFields === 'object') {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.formAction;
        form.setAttribute('enctype', 'application/x-www-form-urlencoded');
        for (const [name, value] of Object.entries(data.formFields)) {
          if (value == null) continue;
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = String(value);
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }
      setError('No se recibieron los datos de pago');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    }
    setLoading(false);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1d4ed8]/20 bg-gradient-to-br from-[#eff6ff] to-white">
      {/* Header */}
      <div className="bg-[#1d4ed8] px-6 py-5 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">Membresía</p>
            <h3 className="text-lg font-bold text-white">Hazte socio del club</h3>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 md:p-8">
        <p className="text-sm font-medium text-stone-600">
          Únete como socio y disfruta de todos los beneficios del club durante un año completo.
        </p>

        {/* Beneficios */}
        <ul className="mt-5 space-y-3">
          {[
            '0,50 € de descuento en cada reserva de pista',
            'Reserva de pistas con sistema online',
            'Descuentos en inscripciones a torneos',
            'Sorteos exclusivos para socios',
          ].map((benefit) => (
            <li key={benefit} className="flex items-start gap-3 text-sm text-stone-700">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#1d4ed8]/10">
                <svg className="h-3 w-3 text-[#1d4ed8]" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="font-medium">{benefit}</span>
            </li>
          ))}
        </ul>

        {/* Precio */}
        <div className="mt-6 flex items-baseline gap-1">
          <span className="text-4xl font-bold text-stone-900">{MEMBERSHIP_FEE} €</span>
          <span className="text-sm font-medium text-stone-500">/ año</span>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{error}</p>
        )}

        {/* CTA */}
        <div className="mt-6">
          {showPayButton ? (
            <button
              type="button"
              onClick={handlePay}
              disabled={loading}
              className="min-h-[48px] w-full rounded-xl bg-[#1d4ed8] px-6 py-3 text-base font-bold text-white shadow-lg shadow-[#1d4ed8]/25 transition hover:bg-[#2563eb] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Redirigiendo al pago…' : `Hazte socio por ${MEMBERSHIP_FEE} €/año`}
            </button>
          ) : (
            <button
              type="button"
              onClick={onCtaClick}
              className="min-h-[48px] w-full rounded-xl bg-[#1d4ed8] px-6 py-3 text-base font-bold text-white shadow-lg shadow-[#1d4ed8]/25 transition hover:bg-[#2563eb] hover:-translate-y-0.5"
            >
              {ctaLabel ?? `Ver membresía (${MEMBERSHIP_FEE} €/año)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
