// Route + plugin registration. Kept separate from index.ts so tests can build
// the app without binding a port.
import cors from "@fastify/cors";
import Fastify from "fastify";
import { logger } from "./config/logger";
import { schedulerStatus } from "./jobs/scheduler";
import { registerErrorHandler } from "./middleware/error";
import { registerAuth } from "./middleware/auth";
import { registerTenantResolver } from "./middleware/tenant";
import { auditRoutes } from "./modules/audit/audit.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { cashSessionsRoutes } from "./modules/cash-sessions/cash-sessions.routes";
import { categoriesRoutes } from "./modules/categories/categories.routes";
import { catalogRoutes } from "./modules/catalog/catalog.routes";
import { customersRoutes } from "./modules/customers/customers.routes";
import { inventoryRoutes } from "./modules/inventory/inventory.routes";
import { paymentsRoutes } from "./modules/payments/payments.routes";
import { purchaseOrdersRoutes } from "./modules/purchase-orders/purchase-orders.routes";
import { refundsRoutes } from "./modules/refunds/refunds.routes";
import { reportsRoutes } from "./modules/reports/reports.routes";
import { salesRoutes } from "./modules/sales/sales.routes";
import { settingsRoutes } from "./modules/settings/settings.routes";
import { storesRoutes } from "./modules/stores/stores.routes";
import { suppliersRoutes } from "./modules/suppliers/suppliers.routes";
import { usersRoutes } from "./modules/users/users.routes";

export async function buildApp() {
  const app = Fastify({ logger });

  // A bodyless request (a DELETE, say) that still declares
  // content-type: application/json is rejected by Fastify's default parser
  // before the route ever runs. Treat an empty payload as "no body" so the
  // route — and its body validator — gets to decide.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    const raw = typeof body === "string" ? body.trim() : body;
    if (!raw) return done(null, undefined);
    try {
      done(null, JSON.parse(String(raw)));
    } catch (err) {
      (err as Error & { statusCode?: number }).statusCode = 400;
      done(err as Error);
    }
  });

  // The PWA is served from a different origin (Vercel) than the API (Render),
  // so the browser needs CORS. Bearer tokens, not cookies, so no credentials.
  await app.register(cors, { origin: true });

  registerErrorHandler(app);
  await registerAuth(app);
  // Verifies the bearer token once per request and attaches the signed tenant
  // id; every scoped query reads the tenant from there, never from the body.
  app.addHook("preHandler", registerTenantResolver);

  // Health is also what the keep-awake job pings and what Render probes, so
  // it stays cheap — but it does report whether Daraja is wired and whether
  // the scheduler is alive, which is exactly what a deploy needs to confirm.
  app.get("/health", async () => ({ status: "ok", scheduler: schedulerStatus() }));

  // Module route registration — one line per vertical slice as modules land.
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(catalogRoutes, { prefix: "/catalog" });
  await app.register(customersRoutes, { prefix: "/customers" });
  await app.register(inventoryRoutes, { prefix: "/inventory" });
  await app.register(salesRoutes, { prefix: "/sales" });
  await app.register(paymentsRoutes, { prefix: "/payments" });
  await app.register(reportsRoutes, { prefix: "/reports" });
  await app.register(settingsRoutes, { prefix: "/settings" });
  await app.register(usersRoutes, { prefix: "/users" });
  await app.register(cashSessionsRoutes, { prefix: "/cash-sessions" });
  await app.register(refundsRoutes, { prefix: "/refunds" });
  await app.register(storesRoutes, { prefix: "/stores" });
  await app.register(categoriesRoutes, { prefix: "/categories" });
  await app.register(suppliersRoutes, { prefix: "/suppliers" });
  await app.register(purchaseOrdersRoutes, { prefix: "/purchase-orders" });
  await app.register(auditRoutes, { prefix: "/audit" });
  // app.register(syncRoutes, { prefix: "/sync" });

  return app;
}
