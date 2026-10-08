// Serwist plugin for the service worker, strict CSP. HTTPS is required for
// service workers, camera access, storage persistence and installability —
// Vercel gives this for free in production; use a tunnel (not a bare IP)
// when testing on a phone locally.
import { accessSync, constants, existsSync } from "node:fs";
import path from "node:path";
import withSerwistInit from "@serwist/next";

// One shared .env at the repo root (see README). Next only auto-loads from
// apps/web, so load it explicitly before the build reads NEXT_PUBLIC_* vars.
const rootEnv = path.resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const withSerwist = withSerwistInit({
  swSrc: "src/sw/index.ts",
  swDest: "public/sw.js",
});

function resolveDistDir() {
  if (process.env.NEXT_DIST_DIR) return process.env.NEXT_DIST_DIR;
  const writable = (dir) => {
    try {
      if (!existsSync(dir)) return true;
      accessSync(dir, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  };
  // Check the tree a build actually writes into: .next and, when a previous
  // build left it behind, .next/server (a top-level dir can be writable while
  // this subdir is owned by another user — that is exactly the EACCES trap).
  if (writable(".next") && writable(".next/server") && writable(".next/cache")) {
    return ".next";
  }
  // Owned by someone else — pick a dir this user can write.
  return ".next-" + (process.env.USER ?? "anon");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace packages ship TypeScript source, which Next must compile like
  // app code rather than treat as prebuilt node_modules.
  transpilePackages: ["@pos/money", "@pos/contracts", "@pos/business-profiles", "@pos/ui"],
  // Same-origin API proxy: the browser never talks to the API origin
  // directly, so CORS is a non-issue and cookies/tokens stay on one origin.
  // Override the upstream with API_INTERNAL_ORIGIN when running the API
  // somewhere else (e.g. PORT=4001 on a busy dev box).
  rewrites: async () => [
    {
      source: "/api/:path*",
      destination: `${process.env.API_INTERNAL_ORIGIN ?? "http://localhost:4000"}/:path*`,
    },
    {
      // The register front end (templates/pos.html, copied into public/ by
      // scripts/copy-templates.mjs) at a clean URL. Each sidebar view also
      // gets its own path (/pos, /pos/dashboard, /pos/inventory,
      // /pos/customers) so the buttons move the address bar and deep links
      // survive a refresh — the template reads the path back on boot.
      source: "/pos",
      destination: "/templates/pos.html",
    },
    {
      source: "/pos/:path*",
      destination: "/templates/pos.html",
    },
  ],
  // Escape hatch for dev boxes where another user owns .next: if it exists
  // but is not writable, build into a sibling directory instead of dying with
  // EACCES halfway through. NEXT_DIST_DIR overrides both.
  distDir: resolveDistDir(),
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
