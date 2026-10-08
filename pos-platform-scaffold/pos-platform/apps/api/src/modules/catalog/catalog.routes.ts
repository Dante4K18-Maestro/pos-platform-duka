// Catalog routes
import type { FastifyInstance } from "fastify";
import { CatalogController } from "./catalog.controller";

export async function catalogRoutes(app: FastifyInstance) {
  const controller = new CatalogController();

  app.get("/", { preHandler: [app.authenticate] }, controller.list.bind(controller));
}
