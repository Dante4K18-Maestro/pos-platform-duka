// Every module has this shape: routes → controller → service → repository.
import type { FastifyInstance } from "fastify";
import { SalesController } from "./sales.controller";

export async function salesRoutes(app: FastifyInstance) {
  const controller = new SalesController();

  app.post("/", controller.create.bind(controller));
  app.get("/:id", controller.getById.bind(controller));
  app.post("/:id/void", controller.void.bind(controller));
}
