import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // config/env.ts validates process.env at import time and fails fast; the
    // setup file supplies the minimum so tests never depend on a local .env.
    setupFiles: ["./src/test/setup-env.ts"],
  },
});
