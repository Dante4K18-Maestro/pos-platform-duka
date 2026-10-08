import { createSupplierSchema, type CreateSupplierInput } from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { SuppliersController } from "./suppliers.controller";

export const suppliersController = new SuppliersController();

export async function suppliersRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.authenticate] }, suppliersController.list.bind(suppliersController));
  app.post<{ readonly Body: CreateSupplierInput }>(
    "/",
    { preHandler: [app.authenticate, validateBody(createSupplierSchema)] },
    suppliersController.create.bind(suppliersController),
  );
}
