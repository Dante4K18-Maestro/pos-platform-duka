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
  // Staff management is a back-office surface end to end.
  app.get("/", { preHandler: [app.authenticate, app.requireRole("owner", "manager")] }, usersController.list.bind(usersController));

  app.post<{ Body: CreateStaffInput }>(
    "/",
    { preHandler: [app.authenticate, app.requireRole("owner", "manager"), validateBody(createStaffSchema)] },
    usersController.create.bind(usersController),
  );

  app.patch<{ Params: { id: string }; Body: UpdateStaffInput }>(
    "/:id",
    { preHandler: [app.authenticate, app.requireRole("owner", "manager"), validateBody(updateStaffSchema)] },
    usersController.update.bind(usersController),
  );
}
