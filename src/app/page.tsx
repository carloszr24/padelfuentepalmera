import Image from 'next/image';
import Link from 'next/link';
import { getCachedAuth } from '@/lib/auth-server';
import { LandingHeader } from '@/components/ui/landing-header';

/** Slider de novedades: fotos de pádel (Unsplash). Sustituye image e instagramUrl por tus publicaciones. */
const NOVEDADES_SLIDER = [
  {
    title: 'Pistas panorámicas',
    category: 'Instalaciones',
    image: 'https://images.unsplash.com/photo-1646649853703-7645147474ba?w=600&q=80',
    instagramUrl: 'https://www.instagram.com/fuentepalmerapadel/?hl=es',
  },
  {
    title: 'Ranking social',
    category: 'Comunidad',
    image: 'https://images.unsplash.com/photo-1658723826297-fe4d1b1e6600?w=600&q=80',
    instagramUrl: 'https://www.instagram.com/fuentepalmerapadel/?hl=es',
  },
  {
    title: 'III Torneo Fuente Palmera',
    category: 'Evento destacado',
    image: 'https://images.unsplash.com/photo-1646651105426-e8c8ee9badde?w=600&q=80',
    instagramUrl: 'https://www.instagram.com/fuentepalmerapadel/?hl=es',
  },
  {
    title: 'Clases para todos los niveles',
    category: 'Escuela',
    image: 'https://images.unsplash.com/photo-1646649851780-d9701b7c3c04?w=600&q=80',
    instagramUrl: 'https://www.instagram.com/fuentepalmerapadel/?hl=es',
  },
  {
    title: 'Nuestro club',
    category: 'Instalaciones',
    image: 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=600&q=80',
    instagramUrl: 'https://www.instagram.com/fuentepalmerapadel/?hl=es',
  },
];

export default async function Home() {
  let user: Awaited<ReturnType<typeof getCachedAuth>>['user'] = null;
  try {
    const auth = await getCachedAuth();
    user = auth.user;
  } catch {
    // Si falla auth (env vars, Supabase, etc.) mostramos la landing sin usuario
  }
  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900">
      <LandingHeader isLoggedIn={!!user} />

      {/* Hero: limpio, impacto en móvil */}
      <section className="relative min-h-[85dvh] overflow-hidden sm:min-h-[90dvh]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/hero-pista.png)' }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-stone-900/50" aria-hidden />
        <div className="relative z-10 mx-auto flex min-h-[85dvh] max-w-5xl flex-col justify-end px-5 pb-16 pt-28 sm:min-h-[90dvh] sm:justify-center sm:pb-24 sm:pt-32 sm:px-8">
          <div className="hero-entrance">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">
              Fuente Palmera · Córdoba
            </p>
            <h1 className="mt-2 text-balance text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow sm:text-4xl md:text-5xl">
              Pista cuando quieras.
              <br />
              <span className="text-[#93c5fd]">Reserva en un clic.</span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/90 sm:text-lg">
              Reserva online, paga el depósito con el monedero y preocúpate solo de jugar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <a
                href={user ? '/panel/reservas' : '/registro'}
                className="inline-flex justify-center rounded-2xl bg-white px-8 py-4 text-base font-bold text-stone-900 shadow-xl transition hover:bg-stone-100 active:scale-[0.98]"
              >
                {user ? 'Reservar pista' : 'Crear cuenta y reservar'}
              </a>
              <a
                href="#que-te-ofrecemos"
                className="inline-flex justify-center rounded-2xl border-2 border-white/80 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Ver cómo funciona
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-white/80">
              <span className="flex items-center gap-2">
                <span className="font-semibold text-white">09:00 – 21:30</span>
                Horario
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold text-white">4,50 €</span>
                Depósito
              </span>
              <span>Reserva 24/7</span>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-14 sm:px-8 sm:pb-32 sm:pt-20">
        {/* Qué te ofrecemos: zona cálida y clara */}
        <section id="que-te-ofrecemos" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">
              Qué te ofrecemos
            </h2>
            <p className="mt-2 text-stone-600">
              Lo que necesitas para reservar y jugar sin complicaciones.
            </p>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50/30 to-amber-50/50 p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FeatureCard
                icon="📅"
                title="Reserva en un clic"
                description="Elige pista, día y hora desde el móvil. Sin llamadas."
              />
              <FeatureCard
                icon="💳"
                title="Monedero digital"
                description="Recarga online, paga el depósito (4,50 €) y el resto en el club."
              />
              <FeatureCard
                icon="🏐"
                title="Pistas en condiciones"
                description="Superficie e iluminación cuidadas. Horario 09:00 – 21:30."
              />
              <FeatureCard
                icon="✓"
                title="Seguro y sencillo"
                description="Pagos con tarjeta, datos protegidos. Solo te preocupas de jugar."
              />
            </div>
          </div>
        </section>

        {/* Instagram: slider más compacto en móvil */}
        <section id="novedades" className="mt-16 space-y-4 sm:mt-20">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-stone-900 sm:text-2xl">
              Novedades
            </h2>
            <a
              href="https://www.instagram.com/fuentepalmerapadel/?hl=es"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[#1d4ed8] hover:underline"
            >
              @fuentepalmerapadel ↗
            </a>
          </div>
          <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
            {NOVEDADES_SLIDER.map((item) => (
              <NewsSliderCard
                key={item.title}
                image={item.image}
                title={item.title}
                category={item.category}
                instagramUrl={item.instagramUrl}
              />
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="mt-16 rounded-2xl bg-stone-900 px-6 py-10 text-white sm:mt-20 sm:px-10 sm:py-12" id="cta">
          <h2 className="text-xl font-bold sm:text-2xl">
            ¿Listo? Crea tu cuenta y reserva tu primera pista.
          </h2>
          <p className="mt-2 text-sm text-stone-300">
            Registro en segundos. Recarga el monedero y a jugar.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/registro"
              className="inline-flex rounded-xl bg-white px-6 py-3 text-sm font-bold text-stone-900 transition hover:bg-stone-100"
            >
              Crear cuenta
            </a>
            <a
              href={user ? '/panel/reservas' : '/registro'}
              className="inline-flex rounded-xl border border-stone-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Ver disponibilidad
            </a>
          </div>
        </section>
      </main>

      <footer id="contacto" className="border-t border-stone-200 bg-white py-10 text-sm text-stone-600">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-5 sm:flex-row sm:items-start sm:justify-between sm:px-8">
          <div className="flex flex-col gap-4">
            <Link href="/" className="inline-flex w-fit">
              <Image src="/logo.png" alt="Fuente Palmera Padel Club" width={120} height={120} className="h-14 w-14 border-0 object-contain object-left outline-none ring-0 sm:h-16 sm:w-16 [&_img]:border-0 [&_img]:outline-none [&_img]:ring-0" unoptimized />
            </Link>
            <p className="font-semibold text-stone-900">Fuente Palmera Padel Club</p>
            <p className="mt-1">
              14120 Fuente Palmera (Córdoba)
              <br />
              <a href="tel:+34600000000" className="hover:text-stone-900 hover:underline">600 000 000</a>
              {' · '}
              <a href="mailto:info@fpadelclub.com" className="hover:text-stone-900 hover:underline">info@fpadelclub.com</a>
            </p>
          </div>
          <div className="flex gap-8">
            <div className="flex flex-col gap-2">
              <Link href="/aviso-legal" className="hover:text-stone-900">Aviso legal</Link>
              <Link href="/privacidad" className="hover:text-stone-900">Privacidad</Link>
              <Link href="/politica-cancelacion" className="hover:text-stone-900">Política de cancelación</Link>
              <Link href="/cookies" className="hover:text-stone-900">Cookies</Link>
            </div>
            <div className="flex flex-col gap-2">
              <a href="https://www.instagram.com/fuentepalmerapadel/?hl=es" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900">Instagram</a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900">Facebook</a>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-5xl px-5 text-center text-xs text-stone-400 sm:px-8">
          © {new Date().getFullYear()} Fuente Palmera Padel Club
        </p>
      </footer>
    </div>
  );
}

type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
};

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex gap-4 rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-amber-200/50 transition hover:bg-white hover:shadow-md hover:ring-amber-300/60">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-2xl">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-stone-900">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{description}</p>
      </div>
    </div>
  );
}

type NewsSliderCardProps = {
  image: string;
  title: string;
  category: string;
  instagramUrl: string;
};

function NewsSliderCard({ image, title, category, instagramUrl }: NewsSliderCardProps) {
  return (
    <a
      href={instagramUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="relative flex w-[160px] flex-shrink-0 snap-start overflow-hidden rounded-xl border border-stone-200 transition hover:opacity-95 sm:w-[180px]"
      style={{ aspectRatio: '9/16' }}
    >
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-900/85 to-transparent" />
      <div className="relative z-10 mt-auto p-3">
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
          {category}
        </span>
        <p className="mt-2 line-clamp-2 text-xs font-bold leading-tight text-white">{title}</p>
      </div>
    </a>
  );
}

