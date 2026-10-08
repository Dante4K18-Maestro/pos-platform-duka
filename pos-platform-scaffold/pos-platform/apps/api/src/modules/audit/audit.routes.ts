import type { FastifyInstance } from "fastify";
import { AuditController } from "./audit.controller";

export const auditController = new AuditController();

export async function auditRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.authenticate] }, auditController.list.bind(auditController));
}
