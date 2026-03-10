import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      { source: '/recuperar-contraseña', destination: '/recuperar-contrasena', permanent: true },
      { source: '/recuperar-contraseña/confirm', destination: '/nueva-contrasena', permanent: true },
    ];
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      // Scripts: propio, Next.js inline (necesario), Clarity
      "script-src 'self' 'unsafe-inline' https://www.clarity.ms",
      // Estilos: propio e inline (Tailwind), Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fuentes
      "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com data:",
      // Imágenes
      "img-src 'self' data: https:",
      // Conexiones: Supabase, Clarity
      "connect-src 'self' https://*.supabase.co https://www.clarity.ms",
      // Solo se permite enviar formularios a Cecabank (producción y test)
      "form-action 'self' https://pgw.ceca.es https://tpv.ceca.es",
      // No se puede incrustar esta web en iframes
      "frame-ancestors 'none'",
      // No se cargan objetos/plugins
      "object-src 'none'",
      // Base URI restringida al propio origen
      "base-uri 'self'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
