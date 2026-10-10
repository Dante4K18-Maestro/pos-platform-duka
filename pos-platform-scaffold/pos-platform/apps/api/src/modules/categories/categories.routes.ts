import { createCategorySchema, type CreateCategoryInput } from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { CategoriesController } from "./categories.controller";

export const categoriesController = new CategoriesController();

export async function categoriesRoutes(app: FastifyInstance) {
  // Category allows, with the rest, shape the admin surface; the register
  // gets its category bar from /catalog instead.
  app.get("/", { preHandler: [app.authenticate, app.requireRole("owner", "manager")] }, categoriesController.list.bind(categoriesController));
  app.post<{ readonly Body: CreateCategoryInput }>(
    "/",
    { preHandler: [app.authenticate, app.requireRole("owner", "manager"), validateBody(createCategorySchema)] },
    categoriesController.create.bind(categoriesController),
  );
}
