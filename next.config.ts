import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Test files (tests/**) are never part of the app bundle and are
    // type-checked separately via `tsc --noEmit` / Vitest — they don't
    // belong in the production build's type-check surface. See
    // tsconfig.build.json.
    tsconfigPath: "./tsconfig.build.json",
  },
};

export default nextConfig;
