'use client';

import { useEffect, useState } from 'react';
import { PANEL_LOGO_PATH } from '@/lib/club-logo';

const NAV_LINKS = [
  { href: '#que-te-ofrecemos', label: 'Qué te ofrecemos' },
  { href: '#novedades', label: 'Novedades' },
  { href: '#cta', label: 'Reservar' },
  { href: '#contacto', label: 'Contacto' },
];

/** Azul corporativo del club */
const BRAND_BLUE = '#1d4ed8';

const SCROLL_THRESHOLD_PX = 50;

type LandingHeaderProps = {
  isLoggedIn?: boolean;
};

export function LandingHeader({ isLoggedIn = false }: LandingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onHero = !scrolled;

  return (
    <header
      className={`inset-x-0 top-0 z-50 transition-all duration-300 ease-out ${
        scrolled
          ? 'fixed border-b border-stone-200 bg-white/95 text-stone-900 shadow-[0_2px_10px_rgba(0,0,0,0.1)] backdrop-blur-md'
          : 'absolute border-b border-transparent bg-transparent text-white'
      }`}
    >
      <div className="relative mx-auto flex min-h-20 w-full max-w-7xl items-center px-4 py-3 sm:min-h-24 sm:px-6 sm:py-4 lg:px-8 lg:py-4 xl:px-10">
        <div className="flex flex-1 items-center justify-start">
          <nav
            className={`hidden items-center gap-5 text-[15px] font-medium tracking-tight md:flex lg:gap-7 lg:text-base ${
              onHero ? 'font-medium' : ''
            }`}
          >
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className={
                  onHero
                    ? 'text-white/95 transition hover:text-white'
                    : 'text-stone-600 transition hover:text-stone-900'
                }
              >
                {label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={
              onHero
                ? 'flex h-10 w-10 items-center justify-center rounded-lg text-white transition hover:bg-white/15 md:hidden'
                : 'flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 md:hidden'
            }
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        <a
          href="/"
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-shrink-0 items-center transition hover:opacity-90"
          aria-label="Fuente Palmera Pádel - Inicio"
        >
          <img
            src={PANEL_LOGO_PATH}
            alt="Fuente Palmera Pádel"
            className={`rounded-full object-contain transition-all duration-300 ${
              onHero ? 'h-12 w-12 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:h-14 sm:w-14' : 'h-14 w-14 sm:h-16 sm:w-16'
            }`}
            width={64}
            height={64}
          />
        </a>

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          {isLoggedIn ? (
            <a
              href="/panel"
              className={
                onHero
                  ? 'rounded-lg border-2 border-white/90 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-white/15 sm:px-5 sm:py-3 lg:text-[15px]'
                  : 'rounded-full border border-stone-300 px-4 py-2.5 text-base font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 sm:px-5 sm:py-3 lg:text-lg'
              }
            >
              Mi panel
            </a>
          ) : (
            <a
              href="/registro"
              className={
                onHero
                  ? 'rounded-lg border-2 border-white/90 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-white/15 sm:px-5 sm:py-3 lg:text-[15px]'
                  : 'rounded-full border border-stone-300 px-4 py-2.5 text-base font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 sm:px-5 sm:py-3 lg:text-lg'
              }
            >
              Únete
            </a>
          )}
          <a
            href={isLoggedIn ? '/panel/reservas' : '/registro'}
            className={`hidden px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] md:inline-flex md:px-6 lg:px-7 lg:py-3.5 lg:text-[15px] ${
              onHero
                ? 'rounded-lg hover:brightness-110'
                : 'rounded-full bg-[#1d4ed8] shadow-[#1d4ed8]/40 hover:bg-[#2563eb] hover:shadow-[#1d4ed8]/50'
            }`}
            style={onHero ? { backgroundColor: BRAND_BLUE } : undefined}
          >
            Reserva tu pista
          </a>
        </div>
      </div>

      {menuOpen && (
        <div
          className={`border-t md:hidden ${
            onHero ? 'border-white/20 bg-white/98 text-stone-900 backdrop-blur-md' : 'border-stone-200 bg-white'
          }`}
        >
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
