import { createCategorySchema, type CreateCategoryInput } from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { CategoriesController } from "./categories.controller";

export const categoriesController = new CategoriesController();

export async function categoriesRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.authenticate] }, categoriesController.list.bind(categoriesController));
  app.post<{ readonly Body: CreateCategoryInput }>(
    "/",
    { preHandler: [app.authenticate, validateBody(createCategorySchema)] },
    categoriesController.create.bind(categoriesController),
  );
}
