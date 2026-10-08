import type { FastifyInstance } from "fastify";
import { InventoryController } from "./inventory.controller";

export const inventoryController = new InventoryController();

export async function inventoryRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [app.authenticate] },
    inventoryController.list.bind(inventoryController),
  );
}
