import Link from 'next/link';

export const metadata = {
  title: 'Política de cancelación',
  description: 'Política de cancelación de reservas de Fuente Palmera Padel Club.',
};

export default function PoliticaCancelacionPage() {
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
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Política de cancelación</h1>
        <p className="mt-2 text-sm text-white/60">
          Reservas y reembolsos
        </p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-white/80">
          <section>
            <p>
              Las cancelaciones realizadas con más de 24 horas de antelación recibirán el reembolso íntegro de la señal.
              Las cancelaciones con menos de 24 horas de antelación no tendrán derecho a reembolso de la señal y
              deberán abonar el importe restante de la reserva.
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
