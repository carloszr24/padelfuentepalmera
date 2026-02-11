import Link from 'next/link';

export const metadata = {
  title: 'Aviso legal',
  description: 'Aviso legal y condiciones de uso del sitio web de Fuente Palmera Padel Club.',
};

export default function AvisoLegalPage() {
  return (
    <div className="min-h-screen bg-[#090613] text-white">
      <header className="border-b border-white/10 bg-[#1B1128]/90 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-sm font-medium text-white/80 hover:text-white">
            ← Volver al inicio
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Aviso legal</h1>
        <p className="mt-2 text-sm text-white/60">
          Última actualización: {new Date().toLocaleDateString('es-ES')}
        </p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-white/80">
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">1. Datos identificativos</h2>
            <p>
              Este sitio web es operado por Fuente Palmera Padel Club. Dirección: 14120 Fuente Palmera (Córdoba).
              Para cualquier consulta puede contactar en info@fpadelclub.com o en el teléfono indicado en la web.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">2. Objeto y aceptación</h2>
            <p>
              El presente aviso legal regula el uso del sitio web. La navegación y uso de los servicios implica
              la aceptación de las condiciones aquí expuestas. Se recomienda leerlas con periodicidad.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">3. Condiciones de uso</h2>
            <p>
              El usuario se compromete a hacer un uso adecuado de los contenidos y servicios (reservas, monedero,
              datos personales) y a no emplearlos para actividades ilícitas o contrarias a la buena fe. La reserva
              de pistas y el uso del monedero digital están sujetos a las condiciones específicas del club.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">4. Propiedad intelectual</h2>
            <p>
              Los contenidos del sitio (textos, imágenes, logotipos, diseño) son propiedad de Fuente Palmera Padel Club
              o de sus licenciantes y están protegidos por la legislación aplicable. No está permitida su reproducción
              o distribución sin autorización previa.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">5. Limitación de responsabilidad</h2>
            <p>
              Fuente Palmera Padel Club no se hace responsable de los daños derivados de fallos técnicos o de
              interrupciones en el servicio, ni del uso indebido de la web por parte del usuario. Los enlaces
              externos que pudieran aparecer son ajenos al sitio y su contenido no es responsabilidad del club.
            </p>
          </section>
        </div>
        <p className="mt-10">
          <Link href="/" className="text-[#FFBBD7] hover:text-white">
            ← Volver al inicio
          </Link>
        </p>
      </main>
    </div>
  );
}
