import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      { source: '/recuperar-contraseña', destination: '/recuperar-contrasena', permanent: true },
      { source: '/recuperar-contraseña/confirm', destination: '/nueva-contrasena', permanent: true },
    ];
  },
};

export default nextConfig;
