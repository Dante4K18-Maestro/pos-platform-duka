import { createPurchaseOrderSchema, type CreatePurchaseOrderInput } from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { PurchaseOrdersController } from "./purchase-orders.controller";

export const purchaseOrdersController = new PurchaseOrdersController();

export async function purchaseOrdersRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [app.authenticate] },
    purchaseOrdersController.list.bind(purchaseOrdersController),
  );
  app.post<{ readonly Body: CreatePurchaseOrderInput }>(
    "/",
    { preHandler: [app.authenticate, validateBody(createPurchaseOrderSchema)] },
    purchaseOrdersController.create.bind(purchaseOrdersController),
  );
}
