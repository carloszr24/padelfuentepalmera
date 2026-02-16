'use client';

import Image from 'next/image';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '#que-te-ofrecemos', label: 'Qué te ofrecemos' },
  { href: '#novedades', label: 'Novedades' },
  { href: '#cta', label: 'Reservar' },
  { href: '#contacto', label: 'Contacto' },
];

type LandingHeaderProps = {
  isLoggedIn?: boolean;
};

export function LandingHeader({ isLoggedIn = false }: LandingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur-md shadow-sm transition">
      <div className="relative mx-auto flex min-h-20 max-w-7xl items-center px-4 py-3 sm:min-h-24 sm:px-6 sm:py-4 lg:px-8 lg:py-4 xl:px-10">
        {/* Izquierda: nav en desktop, hamburger en móvil */}
        <div className="flex flex-1 items-center justify-start">
          <nav className="hidden items-center gap-6 text-sm md:flex lg:gap-8">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="text-stone-600 transition hover:text-stone-900"
              >
                {label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 md:hidden"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            <svg
              className="size-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Centro: logo solo, sin borde ni fondo */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-shrink-0 overflow-hidden rounded-lg bg-transparent [&_img]:!border-0 [&_img]:!shadow-none [&_img]:!outline-none [&_img]:!ring-0">
          <a
            href="/"
            className="block h-14 w-14 transition hover:opacity-90 sm:h-16 sm:w-16"
            aria-label="Fuente Palmera Pádel - Inicio"
          >
            <Image
              src="/logo.png"
              alt="Fuente Palmera Pádel"
              width={64}
              height={64}
              className="h-full w-full object-contain object-center mix-blend-multiply"
              unoptimized
              priority
            />
          </a>
        </div>

        {/* Derecha: acciones */}
        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          {isLoggedIn ? (
            <a
              href="/panel"
              className="rounded-full border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 sm:px-4 sm:py-2.5"
            >
              Mi panel
            </a>
          ) : (
            <a
              href="/registro"
              className="rounded-full border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 sm:px-4 sm:py-2.5"
            >
              Únete
            </a>
          )}
          <a
            href={isLoggedIn ? '/panel/reservas' : '/registro'}
            className="hidden rounded-full bg-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#1d4ed8]/40 transition hover:scale-[1.02] hover:bg-[#2563eb] hover:shadow-[#1d4ed8]/50 md:inline-flex md:px-5"
          >
            Reserva tu pista
          </a>
        </div>
      </div>

      {/* Desplegable móvil: una sola línea de enlaces */}
      {menuOpen && (
        <div className="border-t border-stone-200 bg-white md:hidden">
          <nav
            className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-3 sm:flex-wrap sm:justify-center sm:gap-4 sm:overflow-visible"
            aria-label="Navegación"
          >
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="whitespace-nowrap rounded-full bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-200"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
