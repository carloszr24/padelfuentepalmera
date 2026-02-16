import type { Metadata } from "next";
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
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/favicon-16x16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico?v=2" type="image/x-icon" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" sizes="180x180" />
      </head>
      <body
        className={`${plusJakarta.variable} font-sans antialiased`}
        style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
