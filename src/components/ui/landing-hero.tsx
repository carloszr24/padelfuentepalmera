'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Info, Instagram, Users } from 'lucide-react';

const BRAND_BLUE = '#1d4ed8';
const BRAND_BLUE_LIGHT = '#60a5fa';

type SlideCta = {
  label: string;
  href: string;
  external?: boolean;
  icon?: 'calendar' | 'instagram' | 'users' | 'info';
};

type HeroSlide = {
  badge: string;
  headline: string;
  accent: string;
  sub: string;
  image: string;
  /** Vertical u otras proporciones estrechas: cartel a la derecha, texto a la izquierda */
  imageLayout?: 'cover' | 'vertical-right';
  primaryCta: SlideCta;
  secondaryCta: SlideCta;
};

const SLIDES: HeroSlide[] = [
  {
    badge: 'Reserva online',
    headline: 'Juega en',
    accent: 'otro nivel',
    sub: 'Elige pista, día y hora desde el móvil. Pistas de cristal, iluminación cuidada y monedero digital. Sin llamadas.',
    image: '/imagen-reserva.jpeg',
    primaryCta: { label: 'Reserva tu pista', href: '/registro', icon: 'calendar' },
    secondaryCta: { label: 'Qué te ofrecemos', href: '#que-te-ofrecemos', icon: 'info' },
  },
  {
    badge: 'Escuela de pádel',
    headline: 'Aprende con',
    accent: 'los mejores',
    sub: 'Clases para todos los niveles. Grupos e individuales con monitores del club. ¡Mira cómo entrenamos en Instagram!',
    image: '/clases-foto.png',
    primaryCta: {
      label: 'Ver clases en Instagram',
      href: 'https://www.instagram.com/p/DWe81SzDBzZ/',
      external: true,
      icon: 'instagram',
    },
    secondaryCta: { label: 'Más novedades', href: '#novedades', icon: 'info' },
  },
  {
    badge: 'Hazte socio',
    headline: 'Únete a la',
    accent: 'familia',
    sub: 'Cuota anual de 15 €. Precios exclusivos en reservas, sorteos para socios y acceso a todos los eventos del club.',
    image: '/unete-club-imagen.png',
    imageLayout: 'vertical-right',
    primaryCta: { label: 'Hazte socio', href: '/registro', icon: 'users' },
    secondaryCta: { label: 'Saber más', href: '#que-te-ofrecemos', icon: 'info' },
  },
];

const AUTOPLAY_MS = 2800;
const FADE_MS = 120;

type LandingHeroProps = {
  isLoggedIn?: boolean;
};

function CtaIcon({ icon }: { icon?: SlideCta['icon'] }) {
  const className = 'h-4 w-4 shrink-0';
  switch (icon) {
    case 'calendar':
      return <Calendar className={className} aria-hidden />;
    case 'instagram':
      return <Instagram className={className} aria-hidden />;
    case 'users':
      return <Users className={className} aria-hidden />;
    case 'info':
    default:
      return <Info className={className} aria-hidden />;
  }
}

export function LandingHero({ isLoggedIn = false }: LandingHeroProps) {
  const [current, setCurrent] = useState(0);
  const [contentVisible, setContentVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedMotionRef = useRef(false);

  const slides = SLIDES.map((slide, index) => {
    if (index === 0) {
      return {
        ...slide,
        primaryCta: {
          ...slide.primaryCta,
          href: isLoggedIn ? '/panel/reservas' : '/registro',
        },
      };
    }
    if (index === 2) {
      return {
        ...slide,
        primaryCta: {
          ...slide.primaryCta,
          href: isLoggedIn ? '/panel/membresia' : '/registro',
        },
      };
    }
    return slide;
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (reducedMotionRef.current) return;
    timerRef.current = setInterval(() => {
      setContentVisible(false);
      window.setTimeout(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
        setContentVisible(true);
      }, FADE_MS);
    }, AUTOPLAY_MS);
  }, [clearTimer, slides.length]);

  const goTo = useCallback(
    (index: number) => {
      setContentVisible(false);
      window.setTimeout(() => {
        setCurrent(index);
        setContentVisible(true);
      }, FADE_MS);
      startTimer();
    },
    [startTimer],
  );

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo, slides.length]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo, slides.length]);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    startTimer();
    return clearTimer;
  }, [clearTimer, startTimer]);

  const slide = slides[current];

  return (
    <section
      className="relative h-[100dvh] min-h-[480px] w-full overflow-hidden bg-black"
      aria-roledescription="carrusel"
      aria-label="Destacados del club"
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
      onFocusCapture={clearTimer}
      onBlurCapture={startTimer}
    >
      <div
        className="absolute inset-0 flex transition-transform duration-[550ms] ease-[cubic-bezier(0.77,0,0.18,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(-${current * 100}%)` }}
        aria-live="polite"
      >
        {slides.map((item, index) => (
          <div key={item.badge} className="relative min-w-full h-full" aria-hidden={index !== current}>
            {item.imageLayout === 'vertical-right' ? (
              <>
                <div className="absolute inset-0 bg-[#0a1628]" />
                <div className="absolute inset-y-0 right-0 flex w-[min(62vw,520px)] items-center justify-end sm:w-[min(48vw,480px)]">
                  <img
                    src={item.image}
                    alt=""
                    className="h-full w-full object-contain object-right"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/55 to-black/10 sm:from-black/88 sm:via-black/45" />
              </>
            ) : (
              <>
                <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/20" />
              </>
            )}
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center px-[5vw]">
        <div
          className={`pointer-events-auto max-w-[560px] transition-opacity duration-300 ${
            contentVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span
            className="mb-5 inline-block rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            {slide.badge}
          </span>
          <h1 className="mb-4 text-[clamp(2.25rem,6vw,4rem)] font-extrabold leading-[1.05] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
            {slide.headline}
            <br />
            <span style={{ color: BRAND_BLUE_LIGHT }}>{slide.accent}</span>
          </h1>
          <p className="mb-9 max-w-[420px] text-[clamp(0.875rem,1.6vw,1.0625rem)] leading-relaxed text-white/72">
            {slide.sub}
          </p>
          <div className="flex flex-wrap gap-3.5">
            <a
              href={slide.primaryCta.href}
              {...(slide.primaryCta.external
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
              className="inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-[15px] font-bold text-white transition hover:-translate-y-0.5 hover:brightness-110"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <CtaIcon icon={slide.primaryCta.icon} />
              {slide.primaryCta.label}
            </a>
            <a
              href={slide.secondaryCta.href}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-7 py-3.5 text-[15px] font-medium text-white transition hover:bg-white/20"
            >
              <CtaIcon icon={slide.secondaryCta.icon} />
              {slide.secondaryCta.label}
            </a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goTo(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === current ? 'w-5' : 'w-1.5 bg-white/30'
            }`}
            style={index === current ? { backgroundColor: BRAND_BLUE } : undefined}
            aria-label={`Ir al slide ${index + 1}`}
            aria-current={index === current ? 'true' : undefined}
          />
        ))}
      </div>

      <div className="absolute right-8 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2.5 sm:flex">
        <button
          type="button"
          onClick={prev}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-[#1d4ed8] hover:bg-[#1d4ed8]/20"
          aria-label="Slide anterior"
        >
          <ChevronUp className="h-[18px] w-[18px]" aria-hidden />
        </button>
        <button
          type="button"
          onClick={next}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-[#1d4ed8] hover:bg-[#1d4ed8]/20"
          aria-label="Slide siguiente"
        >
          <ChevronDown className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </div>
    </section>
  );
}
