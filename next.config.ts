import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Saída enxuta para container (Coolify/Docker): gera .next/standalone com server.js
  output: "standalone",
};

export default nextConfig;
