import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  /* config options here */
  // Serwist attaches a `webpack` key to the config even when `disable: true`
  // skips its actual work (see below) — Next 16 refuses to run Turbopack
  // alongside any webpack key unless this is explicitly acknowledged.
  // `next dev` stays on Turbopack (fast HMR); production `build`/`start`
  // still use `--webpack` (package.json) so Serwist's config actually runs.
  turbopack: {},
};

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
