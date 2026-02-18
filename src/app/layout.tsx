import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fuentepalmerapadel.com";

export const metadata: Metadata = {
  title: { default: "Fuente Palmera Pádel", template: "%s | Fuente Palmera Pádel" },
  description: "Club de pádel en Fuente Palmera (Córdoba). Reserva tu pista online, monedero digital y las mejores instalaciones.",
  keywords: ["pádel", "Fuente Palmera", "reservas pista", "club pádel Córdoba"],
  authors: [{ name: "Fuente Palmera Padel Club" }],
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: "Fuente Palmera Pádel",
    title: "Fuente Palmera Pádel — Club de pádel",
    description: "Reserva tu pista en segundos, monedero digital e instalaciones premium.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${plusJakarta.variable} font-sans antialiased`}
        style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
      >
        {children}
        <Script
          id="clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "vj88jtmktp");
            `,
          }}
        />
      </body>
    </html>
  );
}
