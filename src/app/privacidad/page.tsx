import Link from 'next/link';

export const metadata = {
  title: 'Política de privacidad',
  description: 'Política de privacidad y protección de datos de Fuente Palmera Padel Club.',
};

export default function PrivacidadPage() {
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
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Política de privacidad</h1>
        <p className="mt-2 text-sm text-white/60">
          Última actualización: {new Date().toLocaleDateString('es-ES')}
        </p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-white/80">
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">1. Responsable del tratamiento</h2>
            <p>
              Fuente Palmera Padel Club es el responsable del tratamiento de los datos personales que nos facilite
              al registrarse, reservar pistas o utilizar el monedero digital. Puede contactarnos en
              info@fpadelclub.com o en la dirección física indicada en la web.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">2. Datos que recogemos</h2>
            <p>
              Recogemos los datos necesarios para gestionar su cuenta: nombre, correo electrónico y, opcionalmente,
              teléfono. Para las reservas y el monedero almacenamos el historial de reservas y de transacciones
              (recargas, señales, reembolsos). Los pagos con tarjeta se procesan a través de Stripe; no almacenamos
              datos de tarjeta en nuestros servidores.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">3. Finalidad y legitimación</h2>
            <p>
              Utilizamos sus datos para gestionar su cuenta de usuario, las reservas de pistas, el monedero digital
              y la relación contractual con el club. La base legal es la ejecución del contrato y, en su caso, el
              consentimiento que nos haya dado. No realizamos comunicaciones comerciales no solicitadas ni cedemos
              sus datos a terceros con fines de marketing.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">4. Conservación y seguridad</h2>
            <p>
              Conservamos los datos mientras mantenga una cuenta activa y, tras la baja, durante el tiempo que exijan
              las obligaciones legales (fiscal, contable). Aplicamos medidas técnicas y organizativas para proteger
              sus datos (acceso restringido, conexiones seguras, proveedores con garantías adecuadas como Supabase
              y Stripe).
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">5. Derechos</h2>
            <p>
              Puede ejercer sus derechos de acceso, rectificación, supresión, limitación del tratamiento,
              portabilidad y oposición contactando con nosotros. También tiene derecho a reclamar ante la
              Autoridad de Control (AEPD) si considera que el tratamiento no se ajusta a la normativa.
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
