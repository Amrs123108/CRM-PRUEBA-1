import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los adjuntos se suben vía server action (FormData); el límite por
  // archivo (8 MB) se valida aparte en lib/almacenamiento.ts
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
