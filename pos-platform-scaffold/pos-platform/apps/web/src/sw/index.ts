// Serwist: precache the app shell, then apply the Next-aware runtime caching
// strategies. The precache manifest global referenced in the options below is
// injected by the Serwist webpack plugin — it must appear in this source
// exactly once, so never mention its identifier anywhere else (comments
// included) or the plugin fails the build.
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface Window {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Shipping a build id the client can compare against is the other half of a
// safe PWA release; the runtime check lives with the app shell once the
// install/update UI lands.
