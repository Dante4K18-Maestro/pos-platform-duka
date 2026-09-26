// Serwist plugin for the service worker, strict CSP. HTTPS is required for
// service workers, camera access, storage persistence and installability —
// Vercel gives this for free in production; use a tunnel (not a bare IP)
// when testing on a phone locally.
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw/index.ts",
  swDest: "public/sw.js",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    },
  ],
};

export default withSerwist(nextConfig);
