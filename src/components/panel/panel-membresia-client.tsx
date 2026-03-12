'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SocioUpsell } from '@/components/ui/socio-upsell';

type PanelMembresiaClientProps = {
  isActiveMember: boolean;
  expiryDate: string | null;
  startDate: string | null;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00').toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function PanelMembresiaClient({ isActiveMember, expiryDate, startDate }: PanelMembresiaClientProps) {
  const searchParams = useSearchParams();
  const hasError = searchParams?.get('error') === '1';

  const cardClass =
    'rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-card)] p-6 shadow-[var(--panel-shadow-sm)]';

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1
            className="font-bold tracking-tight text-[var(--panel-text)]"
            style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '24px' }}
          >
            Mi membresía
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--panel-text-secondary)]">
            Gestiona tu condición de socio del club.
          </p>
        </div>
        <Link
          href="/panel"
          className="rounded-lg border border-[var(--panel-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--panel-text)] hover:bg-[var(--panel-bg)]"
          prefetch
        >
          Volver al inicio
        </Link>
      </div>

      {hasError && (
        <div className="rounded-[var(--panel-radius)] border border-[#fecaca] p-4" style={{ background: 'var(--panel-red-bg)' }}>
          <p className="text-sm font-medium text-[var(--panel-red)]">
            El pago no se ha completado. Inténtalo de nuevo o contacta con el club.
          </p>
        </div>
      )}

      {isActiveMember ? (
        <div className="space-y-6">
          {/* Estado activo */}
          <div className={`${cardClass} border-l-4 border-l-[var(--panel-green)]`}>
            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'var(--panel-green-bg)' }}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden style={{ color: 'var(--panel-green)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: 'var(--panel-green-bg)', color: 'var(--panel-green)' }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  Socio activo
                </span>
                <p
                  className="mt-2 font-bold tracking-tight text-[var(--panel-text)]"
                  style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '22px' }}
                >
                  Membresía vigente
                </p>
                <p className="mt-1 text-sm text-[var(--panel-text-secondary)]">
                  Tu membresía está activa y puedes reservar pistas.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[var(--panel-border)] pt-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--panel-text-secondary)]">Alta</p>
                <p className="mt-1 font-semibold text-[var(--panel-text)]">{formatDate(startDate)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--panel-text-secondary)]">Vence el</p>
                <p className="mt-1 font-semibold text-[var(--panel-text)]">{formatDate(expiryDate)}</p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="space-y-4">
          {expiryDate && (
            <div className="rounded-[var(--panel-radius)] border border-amber-200 p-4" style={{ background: '#fffbeb' }}>
              <p className="text-sm font-medium text-amber-800">
                Tu membresía caducó el {formatDate(expiryDate)}. Renuévala para seguir reservando pistas.
              </p>
            </div>
          )}
          <SocioUpsell showPayButton />
        </div>
      )}
    </div>
  );
}
