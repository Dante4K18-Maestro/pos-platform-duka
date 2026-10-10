import { createStoreSchema, type CreateStoreInput } from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { StoresController } from "./stores.controller";

export const storesController = new StoresController();

export async function storesRoutes(app: FastifyInstance) {
  // Store administration lives in the back office; the till only names its
  // own register from the catalog snapshot, not from here.
  app.get("/", { preHandler: [app.authenticate, app.requireRole("owner", "manager")] }, storesController.list.bind(storesController));
  app.post<{ readonly Body: CreateStoreInput }>(
    "/",
    { preHandler: [app.authenticate, app.requireRole("owner", "manager"), validateBody(createStoreSchema)] },
    storesController.create.bind(storesController),
  );
}
