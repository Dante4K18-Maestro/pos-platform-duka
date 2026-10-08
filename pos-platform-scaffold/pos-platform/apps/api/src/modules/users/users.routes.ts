import {
  createStaffSchema,
  updateStaffSchema,
  type CreateStaffInput,
  type UpdateStaffInput,
} from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { UsersController } from "./users.controller";

export const usersController = new UsersController();

export async function usersRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.authenticate] }, usersController.list.bind(usersController));

  app.post<{ Body: CreateStaffInput }>(
    "/",
    { preHandler: [app.authenticate, validateBody(createStaffSchema)] },
    usersController.create.bind(usersController),
  );

  app.patch<{ Params: { id: string }; Body: UpdateStaffInput }>(
    "/:id",
    { preHandler: [app.authenticate, validateBody(updateStaffSchema)] },
    usersController.update.bind(usersController),
  );
}
