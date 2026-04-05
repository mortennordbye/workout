import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

// Configure Serwist for PWA functionality
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // Disable in development for faster iteration
});

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  // This creates a minimal production server in .next/standalone/
  output: "standalone",

  // Explicitly enable Turbopack (Next.js 16 default)
  // Empty config silences the webpack/turbopack conflict warning
  turbopack: {},

  // Cache dynamic page payloads in the client-side router cache for 30 seconds.
  // Navigating back to a recently visited tab shows data instantly without
  // hitting the server again.
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default withSerwist(nextConfig);
