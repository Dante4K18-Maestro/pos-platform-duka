import { createCustomerSchema, type CreateCustomerInput } from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { CustomersController } from "./customers.controller";

export const customersController = new CustomersController();

export async function customersRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [app.authenticate] },
    customersController.list.bind(customersController),
  );
  app.post<{
    readonly Body: CreateCustomerInput;
  }>(
    "/",
    { preHandler: [app.authenticate, validateBody(createCustomerSchema)] },
    customersController.create.bind(customersController),
  );
}
