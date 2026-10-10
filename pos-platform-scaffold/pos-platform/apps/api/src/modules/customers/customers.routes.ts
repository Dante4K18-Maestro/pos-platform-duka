import { createCustomerSchema, type CreateCustomerInput } from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { CustomersController } from "./customers.controller";

export const customersController = new CustomersController();

export async function customersRoutes(app: FastifyInstance) {
  // The customer book is a back-office view; the till only searches a
  // customer to attach a sale/loyalty (via its own lookup), never browses.
  app.get(
    "/",
    { preHandler: [app.authenticate, app.requireRole("owner", "manager")] },
    customersController.list.bind(customersController),
  );
  // Registering a customer happens at the counter too, so this stays open
  // to the till; edits/removals remain back-office work.
  app.post<{
    readonly Body: CreateCustomerInput;
  }>(
    "/",
    { preHandler: [app.authenticate, validateBody(createCustomerSchema)] },
    customersController.create.bind(customersController),
  );
}
