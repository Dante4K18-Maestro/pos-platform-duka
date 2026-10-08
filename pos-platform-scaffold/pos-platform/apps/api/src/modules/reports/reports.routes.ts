// Reports routes
import type { FastifyInstance } from "fastify";
import { ReportsController } from "./reports.controller";

export async function reportsRoutes(app: FastifyInstance) {
  const controller = new ReportsController();

  app.get("/overview", { preHandler: [app.authenticate] }, controller.overview.bind(controller));
}
