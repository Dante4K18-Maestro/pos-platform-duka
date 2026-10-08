import { createStoreSchema, type CreateStoreInput } from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { StoresController } from "./stores.controller";

export const storesController = new StoresController();

export async function storesRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.authenticate] }, storesController.list.bind(storesController));
  app.post<{ readonly Body: CreateStoreInput }>(
    "/",
    { preHandler: [app.authenticate, validateBody(createStoreSchema)] },
    storesController.create.bind(storesController),
  );
}
