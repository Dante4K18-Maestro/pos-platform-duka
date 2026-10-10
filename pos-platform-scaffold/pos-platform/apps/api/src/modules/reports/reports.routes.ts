// Reports routes
import type { FastifyInstance } from "fastify";
import { ReportsController } from "./reports.controller";

export async function reportsRoutes(app: FastifyInstance) {
  const controller = new ReportsController();

  // Business reporting is a back-office view; the till has its own numbers.
  app.get("/overview", { preHandler: [app.authenticate, app.requireRole("owner", "manager")] }, controller.overview.bind(controller));
}
