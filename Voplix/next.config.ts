import type { NextConfig } from "next";

// NOTE: Do not set `turbopack.root` to this app directory on Next.js 16.x — it breaks
// Tailwind v4 `@import "tailwindcss"` resolution (modules resolve from the parent folder).
// See: https://github.com/vercel/next.js/issues/90307
const nextConfig: NextConfig = {};

export default nextConfig;
