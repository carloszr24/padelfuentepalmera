import Link from 'next/link';

export const metadata = {
  title: 'Política de cookies',
  description: 'Información sobre el uso de cookies en el sitio web de Fuente Palmera Padel Club.',
};

export default function CookiesPage() {
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
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Política de cookies</h1>
        <p className="mt-2 text-sm text-white/60">
          Última actualización: {new Date().toLocaleDateString('es-ES')}
        </p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-white/80">
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">1. Qué son las cookies</h2>
            <p>
              Las cookies son pequeños archivos de texto que los sitios web pueden almacenar en su dispositivo
              (ordenador, tablet, móvil) para recordar preferencias, mantener la sesión o analizar el uso del sitio.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">2. Cookies que utilizamos</h2>
            <p>
              Este sitio utiliza cookies técnicas y de sesión necesarias para el correcto funcionamiento de la web:
              inicio de sesión (autenticación), preferencias de idioma y seguridad. Sin ellas no sería posible
              acceder al panel de usuario, realizar reservas o usar el monedero. No utilizamos cookies de publicidad
              ni de redes sociales de terceros para seguimiento publicitario en esta web.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">3. Consentimiento</h2>
            <p>
              Al usar este sitio y, en particular, al iniciar sesión o registrarse, acepta el uso de las cookies
              técnicas necesarias para dichos servicios. Puede configurar su navegador para bloquear o eliminar
              cookies; tenga en cuenta que ello puede afectar al funcionamiento del sitio (por ejemplo, no podrá
              mantener la sesión iniciada).
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-base font-semibold text-white">4. Más información</h2>
            <p>
              Para cualquier duda sobre el uso de cookies puede contactarnos en info@fpadelclub.com. Para más
              información sobre sus datos personales, consulte nuestra{' '}
              <Link href="/privacidad" className="text-[#FFBBD7] hover:text-white underline">
                Política de privacidad
              </Link>
              .
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
