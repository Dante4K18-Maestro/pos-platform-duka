import {
  closeCashSessionSchema,
  createCashMovementSchema,
  openCashSessionSchema,
  type CloseCashSessionInput,
  type CreateCashMovementInput,
  type OpenCashSessionInput,
} from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { CashSessionsController } from "./cash-sessions.controller";

export const cashSessionsController = new CashSessionsController();

export async function cashSessionsRoutes(app: FastifyInstance) {
  app.get(
    "/",
    { preHandler: [app.authenticate] },
    cashSessionsController.list.bind(cashSessionsController),
  );

  app.post<{ Body: OpenCashSessionInput }>(
    "/",
    { preHandler: [app.authenticate, validateBody(openCashSessionSchema)] },
    cashSessionsController.open.bind(cashSessionsController),
  );

  app.post<{ Params: { id: string }; Body: CloseCashSessionInput }>(
    "/:id/close",
    { preHandler: [app.authenticate, validateBody(closeCashSessionSchema)] },
    cashSessionsController.close.bind(cashSessionsController),
  );

  app.post<{ Params: { id: string }; Body: CreateCashMovementInput }>(
    "/:id/movements",
    { preHandler: [app.authenticate, validateBody(createCashMovementSchema)] },
    cashSessionsController.addMovement.bind(cashSessionsController),
  );
}
