import type { FastifyInstance } from "fastify";
import { AuditController } from "./audit.controller";

export const auditController = new AuditController();

export async function auditRoutes(app: FastifyInstance) {
  // The audit trail is owner eyes only.
  app.get("/", { preHandler: [app.authenticate, app.requireRole("owner")] }, auditController.list.bind(auditController));
}
