import Link from 'next/link';
import { getCachedAuth } from '@/lib/auth-server';
import { LandingHeader } from '@/components/ui/landing-header';

/** Slider de novedades: fotos de pádel (Unsplash). Sustituye image e instagramUrl por tus publicaciones. */
const NOVEDADES_SLIDER = [
  {
    title: 'Pistas panorámicas',
    category: 'Instalaciones',
    image: 'https://images.unsplash.com/photo-1646649853703-7645147474ba?w=600&q=80',
    instagramUrl: 'https://instagram.com',
  },
  {
    title: 'Ranking social',
    category: 'Comunidad',
    image: 'https://images.unsplash.com/photo-1658723826297-fe4d1b1e6600?w=600&q=80',
    instagramUrl: 'https://instagram.com',
  },
  {
    title: 'III Torneo Fuente Palmera',
    category: 'Evento destacado',
    image: 'https://images.unsplash.com/photo-1646651105426-e8c8ee9badde?w=600&q=80',
    instagramUrl: 'https://instagram.com',
  },
  {
    title: 'Clases para todos los niveles',
    category: 'Escuela',
    image: 'https://images.unsplash.com/photo-1646649851780-d9701b7c3c04?w=600&q=80',
    instagramUrl: 'https://instagram.com',
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
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <LandingHeader isLoggedIn={!!user} />

      {/* Hero a pantalla completa: ancho total + altura viewport */}
      <section className="relative min-h-screen min-h-[100dvh] overflow-hidden">
        <div
          className="absolute inset-0 bg-stone-900/15"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/hero-pista.png)',
            filter: 'blur(2px)',
            transform: 'scale(1.03)',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-white/75 backdrop-blur-[1px]" aria-hidden />

        <div className="relative z-10 mx-auto flex min-h-screen min-h-[100dvh] max-w-7xl flex-col justify-center px-4 py-24 sm:px-6 md:px-8 md:py-28 xl:px-10">
          <div className="max-w-2xl hero-entrance">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1d4ed8]">
              Fuente Palmera Padel Club
            </p>
            <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl md:text-5xl lg:text-6xl">
              Reserva tu pista. Juega.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-stone-600 sm:text-base">
              Reserva tu pista en segundos, gestiona tu monedero digital y
              disfruta de unas instalaciones pensadas para que solo te
              preocupes de ganar el partido.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={user ? '/panel/reservas' : '/registro'}
                className="rounded-full bg-[#1d4ed8] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1d4ed8]/30 transition hover:scale-[1.02] hover:bg-[#1e40af] hover:shadow-[#1d4ed8]/40 active:scale-[0.98]"
              >
                Reserva tu pista
              </a>
              <a
                href="/registro"
                className="rounded-full border border-stone-300 bg-white/90 px-6 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
              >
                Crea tu cuenta
              </a>
            </div>

            {/* Solo info genérica del club, sin datos de usuarios */}
            <div className="mt-10 grid gap-4 text-sm sm:grid-cols-3 sm:text-xs md:text-sm">
              <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm transition hover:border-stone-300 hover:bg-white">
                <p className="text-xs text-stone-500">Horarios</p>
                <p className="mt-1 text-lg font-semibold text-stone-900">09:00 - 21:30</p>
                <p className="mt-1 text-xs text-stone-500">Partidos de 1,5 horas</p>
              </div>
              <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm transition hover:border-stone-300 hover:bg-white">
                <p className="text-xs text-stone-500">Reserva online</p>
                <p className="mt-1 text-lg font-semibold text-stone-900">24/7</p>
                <p className="mt-1 text-xs text-stone-500">Desde cualquier dispositivo</p>
              </div>
              <div className="rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm transition hover:border-stone-300 hover:bg-white">
                <p className="text-xs text-stone-500">Señal</p>
                <p className="mt-1 text-lg font-semibold text-stone-900">4,50 €</p>
                <p className="mt-1 text-xs text-stone-500">Resto en el club</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-7xl flex-col gap-28 px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:gap-32 lg:pb-36 xl:px-10">
        {/* Qué te ofrecemos */}
        <section id="que-te-ofrecemos" className="space-y-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-stone-900 md:text-3xl lg:text-4xl">
                Qué te ofrecemos
              </h2>
              <p className="mt-2 max-w-xl text-sm text-stone-600">
                Una experiencia completa para que gestionar tus partidos sea tan
                sencillo como disfrutar de ellos.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              title="Reserva online"
              description="Elige pista, día y hora en segundos desde tu móvil o portátil."
            />
            <FeatureCard
              title="Monedero digital"
              description="Recarga con Stripe y paga solo la señal. El resto en el club."
            />
            <FeatureCard
              title="100% seguro"
              description="Pagos cifrados, control de saldo con RLS y seguridad avanzada."
            />
            <FeatureCard
              title="Pistas premium"
              description="Superficie cuidada, iluminación LED y horarios amplios."
            />
          </div>
        </section>

        {/* Novedades / Slider con foto de fondo → Instagram */}
        <section id="novedades" className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Síguenos en Instagram
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
                Novedades del <span className="text-[#1d4ed8]">club</span>
              </h2>
              <p className="mt-2 max-w-xl text-sm text-stone-600">
                Torneos, instalaciones y el día a día. Pulsa en cada carta para
                ver la publicación en Instagram.
              </p>
            </div>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#1d4ed8] hover:text-[#1e40af]"
            >
              @fuentepalmerapadel
              <span aria-hidden>↗</span>
            </a>
          </div>

          <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
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

        {/* Reseñas */}
        <section id="resenas" className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-900 md:text-3xl">
                Lo que dicen nuestros jugadores
              </h2>
              <p className="mt-2 max-w-xl text-sm text-stone-600">
                Opiniones reales de jugadores que ya disfrutan del club.
              </p>
            </div>
          </div>

          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            <ReviewCard
              name="Carlos"
              text="Reservar pista es comodísimo y el monedero evita estar pagando cada vez. Instalaciones muy cuidadas."
            />
            <ReviewCard
              name="Marta"
              text="Los horarios son perfectos para después del trabajo y siempre encuentro nivel similar para jugar."
            />
            <ReviewCard
              name="Álvaro"
              text="La iluminación y el estado de las pistas es top. El sistema de reservas funciona perfecto."
            />
            <ReviewCard
              name="Lucía"
              text="El club se implica mucho con la comunidad. Torneos, ranking y buen ambiente siempre."
            />
          </div>
        </section>

        {/* CTA final */}
        <section className="rounded-3xl border border-stone-200 bg-white px-8 py-12 shadow-lg shadow-stone-200/60 md:px-12 md:py-14">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-balance text-2xl font-bold tracking-tight text-stone-900 md:text-3xl lg:text-4xl">
                ¿Listo para reservar y jugar?
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-600">
                Crea tu cuenta en segundos, recarga tu monedero y reserva tu
                primera pista hoy mismo.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <a
                href="/registro"
                className="rounded-full bg-[#1d4ed8] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1d4ed8]/30 transition hover:scale-[1.02] hover:bg-[#1e40af] hover:shadow-[#1d4ed8]/40 active:scale-[0.98]"
              >
                Crear cuenta
              </a>
              <a
                href={user ? '/panel/reservas' : '/registro'}
                className="rounded-full border border-stone-300 px-7 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
              >
                Ver disponibilidad
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        id="contacto"
        className="border-t border-stone-200 bg-white py-8 text-sm text-stone-600"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:flex-row md:items-start md:justify-between md:px-6 lg:px-8 xl:px-10">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-stone-900">
              Fuente Palmera Padel Club
            </p>
            <p>
              Dirección del club · 14120 Fuente Palmera (Córdoba)
              <br />
              Tel: <a href="tel:+34600000000" className="underline-offset-2 hover:text-stone-900 hover:underline">600 000 000</a>
              {' · '}
              Email: <a href="mailto:info@fpadelclub.com" className="underline-offset-2 hover:text-stone-900 hover:underline">info@fpadelclub.com</a>
            </p>
          </div>

          <div className="flex flex-wrap gap-10">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Legal
              </p>
              <div className="flex flex-col gap-1">
                <Link href="/aviso-legal" className="hover:text-stone-900">
                  Aviso legal
                </Link>
                <Link href="/privacidad" className="hover:text-stone-900">
                  Política de privacidad
                </Link>
                <Link href="/cookies" className="hover:text-stone-900">
                  Política de cookies
                </Link>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Redes
              </p>
              <div className="flex flex-col gap-1">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-stone-900"
                >
                  Instagram
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900">
                  Facebook
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 text-center text-xs text-stone-400">
          © {new Date().getFullYear()} Fuente Palmera Padel Club. Todos los
          derechos reservados.
        </div>
      </footer>
    </div>
  );
}

type FeatureCardProps = {
  title: string;
  description: string;
};

function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/50 transition hover:border-[#1d4ed8]/40 hover:shadow-xl hover:shadow-stone-200/60">
      <h3 className="text-base font-semibold text-stone-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p>
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
      className="relative flex w-[200px] flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-stone-200 shadow-lg shadow-stone-200/50 transition hover:scale-[1.02] hover:border-[#1d4ed8]/50 hover:shadow-xl sm:w-[220px] md:w-[240px]"
      style={{ aspectRatio: '9/16' }}
    >
      <span className="absolute inset-0 z-0 bg-stone-900/20" aria-hidden />
      <img
        src={image}
        alt=""
        className="absolute inset-0 z-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-stone-900/90 via-transparent to-transparent" />
      <div className="relative z-20 mt-auto flex flex-col justify-end p-4 pb-5">
        <span className="mb-2 inline-flex w-fit rounded-full bg-[#1d4ed8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          {category}
        </span>
        <h3 className="text-sm font-bold uppercase leading-tight text-white sm:text-base md:text-lg">
          {title}
        </h3>
        <p className="mt-1.5 text-[11px] font-medium text-white/90">Ver en Instagram ↗</p>
      </div>
    </a>
  );
}

type ReviewCardProps = {
  name: string;
  text: string;
};

function ReviewCard({ name, text }: ReviewCardProps) {
  return (
    <figure className="min-w-[280px] max-w-sm snap-start rounded-2xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/50 transition hover:border-stone-300 hover:shadow-xl">
      <p className="text-sm leading-relaxed text-stone-700">“{text}”</p>
      <figcaption className="mt-4 text-xs font-semibold text-stone-600">
        — {name}
      </figcaption>
    </figure>
  );
}
