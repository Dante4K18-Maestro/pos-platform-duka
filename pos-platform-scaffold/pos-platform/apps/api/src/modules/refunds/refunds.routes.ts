import { createRefundSchema, type CreateRefundInput } from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { RefundsController } from "./refunds.controller";

export const refundsController = new RefundsController();

export async function refundsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.authenticate] }, refundsController.list.bind(refundsController));

  // What is still refundable on a sale, for the refund form.
  app.get(
    "/sale/:saleId",
    { preHandler: [app.authenticate] },
    refundsController.refundable.bind(refundsController),
  );

  app.post<{ Params: { saleId: string }; Body: CreateRefundInput }>(
    "/sale/:saleId",
    { preHandler: [app.authenticate, validateBody(createRefundSchema)] },
    refundsController.create.bind(refundsController),
  );
}
