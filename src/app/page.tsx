import Link from 'next/link';
import { CLUB_LOGO_PATH } from '@/lib/club-logo';
import { EVENPADEL_EVENPADEL_TOURNAMENT_URL } from '@/lib/evenpadel-tournament';
import { getCachedAuth } from '@/lib/auth-server';
import { LandingHeader } from '@/components/ui/landing-header';

/** Slider de novedades: fotos de pádel (Unsplash). Sustituye image e instagramUrl por tus publicaciones. */
const NOVEDADES_SLIDER = [
  {
    title: 'Pistas panorámicas',
    category: 'Instalaciones',
    image: 'https://images.unsplash.com/photo-1646649853703-7645147474ba?w=600&q=80',
    instagramUrl: 'https://www.instagram.com/fuentepalmerapadel/',
  },
  {
    title: 'Ranking social',
    category: 'Comunidad',
    image: 'https://images.unsplash.com/photo-1658723826297-fe4d1b1e6600?w=600&q=80',
    instagramUrl: 'https://www.instagram.com/fuentepalmerapadel/',
  },
  {
    title: 'III Torneo Fuente Palmera',
    category: 'Evento destacado',
    image: 'https://images.unsplash.com/photo-1646651105426-e8c8ee9badde?w=600&q=80',
    instagramUrl: 'https://www.instagram.com/fuentepalmerapadel/',
  },
  {
    title: 'Clases para todos los niveles',
    category: 'Escuela',
    image: '/carrusel-clases.jpg',
    instagramUrl: 'https://www.instagram.com/p/DWe81SzDBzZ/',
  },
  {
    title: 'Nuestro club',
    category: 'Instalaciones',
    image: 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=600&q=80',
    instagramUrl: 'https://www.instagram.com/fuentepalmerapadel/',
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
    <div className="relative min-h-screen bg-[#faf8f5] text-stone-900">
      <LandingHeader isLoggedIn={!!user} />

      {/* Móvil: imagen ancho 100% y alto natural (sin bandas laterales; puede alargar y hacer scroll). Desktop: 100dvh + contain. */}
      <section className="relative w-full overflow-hidden bg-black lg:h-[100dvh] lg:min-h-[100dvh]">
        {/* Móvil / tablet: cartel vertical a ancho completo */}
        <div className="relative z-0 w-full lg:hidden">
          <img
            src="/hero-movil.png"
            alt="Even Padel Tour — Fuente Palmera"
            className="block h-auto w-full max-w-none"
            sizes="100vw"
            width={864}
            height={1821}
            fetchPriority="high"
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[min(42%,220px)] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.2)_55%,transparent_100%)]"
            aria-hidden
          />
          <a
            href={EVENPADEL_TOURNAMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir inscripción al torneo en EvenPadel"
            className="absolute inset-0 z-10"
          />
        </div>

        {/* Escritorio ancho (lg+): cartel horizontal en viewport */}
        <div className="absolute inset-0 z-0 hidden px-1 sm:px-2 md:px-3 lg:block">
          <div className="relative h-full w-full">
            <img
              src="/hero-primer-torneo-ordenador.png"
              alt="Even Padel Tour — Fuente Palmera"
              className="h-full w-full object-contain object-center"
              sizes="100vw"
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.22)_28%,transparent_55%)]"
              aria-hidden
            />
          </div>
          <a
            href={EVENPADEL_TOURNAMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir inscripción al torneo en EvenPadel"
            className="absolute inset-0 z-10"
          />
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-14 sm:px-6 md:px-8 sm:pb-32 sm:pt-20">
        {/* Qué te ofrecemos: zona cálida y clara */}
        <section id="que-te-ofrecemos" className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-stone-900 sm:text-4xl md:text-4xl">
              Qué te ofrecemos
            </h2>
            <p className="mt-2 text-base text-stone-600 sm:text-lg">
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
                description="Superficie e iluminación cuidadas. Horario 09:30–14:00 y 16:30–22:30."
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
            <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl md:text-4xl">
              Novedades
            </h2>
            <a
              href="https://www.instagram.com/fuentepalmerapadel/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-semibold text-[#1d4ed8] hover:underline md:text-lg"
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
        <section className="mt-16 rounded-2xl bg-stone-900 px-6 py-10 text-white sm:mt-20 sm:px-10 sm:py-12 md:py-14" id="cta">
          <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">
            ¿Listo? Crea tu cuenta y reserva tu primera pista.
          </h2>
          <p className="mt-2 text-base text-stone-300 sm:text-lg">
            Registro en segundos. Recarga el monedero y a jugar.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 md:mt-8 md:gap-4">
            <a
              href="/registro"
              className="inline-flex rounded-xl bg-white px-6 py-3 text-base font-bold text-stone-900 transition hover:bg-stone-100 md:px-8 md:py-4 md:text-lg"
            >
              Crear cuenta
            </a>
            <a
              href={user ? '/panel/reservas' : '/registro'}
              className="inline-flex rounded-xl border border-stone-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-stone-800 md:px-8 md:py-4 md:text-lg"
            >
              Ver disponibilidad
            </a>
          </div>
        </section>
      </main>

      <footer id="contacto" className="border-t border-stone-200 bg-white py-10 text-base text-stone-600 md:py-12 md:text-lg">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-5 sm:flex-row sm:items-start sm:justify-between sm:px-8">
          <div className="flex flex-col gap-4">
            <Link href="/" className="inline-flex w-fit">
              <img src={CLUB_LOGO_PATH} alt="Fuente Palmera Padel Club" className="h-14 w-14 object-contain object-left sm:h-16 sm:w-16" width={64} height={64} />
            </Link>
            <p className="font-semibold text-stone-900">Fuente Palmera Padel Club</p>
            <p className="mt-1">
              Crta. La Ventilla - Fuente Palmera (Detrás de empresa Ferroinsa)
              <br />
              <a href="tel:+34634500753" className="hover:text-stone-900 hover:underline">+34 634 50 07 53</a>
              {' · '}
              <a href="mailto:info@padelfuentepalmera.com" className="hover:text-stone-900 hover:underline">info@padelfuentepalmera.com</a>
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
              <a href="https://www.instagram.com/fuentepalmerapadel/" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900">Instagram</a>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-5xl px-5 text-center text-sm text-stone-400 sm:px-8 md:text-base">
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
    <div className="flex gap-4 rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-amber-200/50 transition hover:bg-white hover:shadow-md hover:ring-amber-300/60 sm:p-6 md:gap-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-2xl md:h-14 md:w-14 md:text-3xl">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-stone-900 text-lg md:text-xl">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-600 sm:text-base md:mt-2">{description}</p>
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

