import type { FastifyReply, FastifyRequest } from "fastify";
import { AuditService } from "./audit.service";

export class AuditController {
  constructor(private readonly service = new AuditService()) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }
    return reply.send({ entries: await this.service.list(tenantId) });
  }
}
