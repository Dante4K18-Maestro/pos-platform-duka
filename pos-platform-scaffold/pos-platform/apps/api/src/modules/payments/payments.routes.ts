import { mpesaCallbackSchema, paymentInputSchema, type MpesaCallbackBody, type PaymentInput } from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { env } from "../../config/env";
import { validateBody } from "../../middleware/validate";
import { PaymentsController } from "./payments.controller";

export const paymentsController = new PaymentsController();

export async function paymentsRoutes(app: FastifyInstance) {
  // Public: Safaricom posts here and carries no bearer token.
  app.post<{ Body: MpesaCallbackBody }>(
    "/mpesa/callback",
    { preHandler: [validateBody(mpesaCallbackSchema)] },
    paymentsController.mpesaCallback.bind(paymentsController),
  );

  // Dev-only stand-in for a Daraja callback, because Safaricom cannot reach a
  // laptop. Hard-disabled in production.
  app.post<{ Params: { paymentId: string } }>(
    "/mpesa/simulate/:paymentId",
    {
      preHandler: [
        async (_req, reply) => {
          if (env.NODE_ENV === "production") {
            return reply
              .status(404)
              .send({ error: { message: "not found", code: "NOT_FOUND" } });
          }
        },
        app.authenticate,
      ],
    },
    paymentsController.simulate.bind(paymentsController),
  );

  app.post<{ Params: { saleId: string }; Body: PaymentInput }>(
    "/:saleId",
    { preHandler: [app.authenticate, validateBody(paymentInputSchema)] },
    paymentsController.record.bind(paymentsController),
  );
}
