import { createPurchaseOrderSchema, type CreatePurchaseOrderInput } from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { PurchaseOrdersController } from "./purchase-orders.controller";

export const purchaseOrdersController = new PurchaseOrdersController();

export async function purchaseOrdersRoutes(app: FastifyInstance) {
  // Purchasing is back-office: no PO list at the till.
  app.get(
    "/",
    { preHandler: [app.authenticate, app.requireRole("owner", "manager")] },
    purchaseOrdersController.list.bind(purchaseOrdersController),
  );
  app.post<{ readonly Body: CreatePurchaseOrderInput }>(
    "/",
    { preHandler: [app.authenticate, app.requireRole("owner", "manager"), validateBody(createPurchaseOrderSchema)] },
    purchaseOrdersController.create.bind(purchaseOrdersController),
  );
}
