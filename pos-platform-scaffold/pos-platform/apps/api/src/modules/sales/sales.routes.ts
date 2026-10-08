// Every module has this shape: routes → controller → service → repository.
import { createSaleSchema } from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { SalesController } from "./sales.controller";

export async function salesRoutes(app: FastifyInstance) {
  const controller = new SalesController();

  app.post(
    "/",
    { preHandler: [app.authenticate, validateBody(createSaleSchema)] },
    controller.create.bind(controller),
  );
  app.get("/:id", { preHandler: [app.authenticate] }, controller.getById.bind(controller));
  app.post("/:id/void", { preHandler: [app.authenticate] }, controller.void.bind(controller));
}
