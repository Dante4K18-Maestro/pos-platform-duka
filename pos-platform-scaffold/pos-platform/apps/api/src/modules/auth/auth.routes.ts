import { loginSchema } from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { AuthController } from "./auth.controller";

export async function authRoutes(app: FastifyInstance) {
  const controller = new AuthController();

  // Public: this is where a session comes from. Everything else is guarded.
  app.post("/login", { preHandler: [validateBody(loginSchema)] }, controller.login.bind(controller));
}
