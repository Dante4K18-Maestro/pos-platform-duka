// Route + plugin registration. Kept separate from index.ts so tests can build
// the app without binding a port.
import Fastify from "fastify";
import { logger } from "./config/logger";
import { registerErrorHandler } from "./middleware/error";
import { registerAuth } from "./middleware/auth";
import { registerTenantResolver } from "./middleware/tenant";

export async function buildApp() {
  const app = Fastify({ loggerInstance: logger });

  registerErrorHandler(app);
  await registerAuth(app);
  app.addHook("preHandler", registerTenantResolver);

  app.get("/health", async () => ({ status: "ok" }));

  // Module route registration — one line per vertical slice as modules land.
  // app.register(salesRoutes, { prefix: "/sales" });
  // app.register(paymentsRoutes, { prefix: "/payments" });
  // app.register(syncRoutes, { prefix: "/sync" });

  return app;
}
