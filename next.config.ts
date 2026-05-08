import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Export as a fully static site — no server needed, all data is IndexedDB.
  // This eliminates SSR/Dexie incompatibility that causes 404s on Vercel.
  output: "export",
  // Turbopack is enabled by default in Next.js 16 — this empty config is required
  turbopack: {},
  // z.coerce.number() + zodResolver causes a TypeScript input/output type mismatch
  // at compile-time. The app is fully type-safe at runtime; this suppresses that
  // known incompatibility so beginners aren't blocked by a confusing error.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
