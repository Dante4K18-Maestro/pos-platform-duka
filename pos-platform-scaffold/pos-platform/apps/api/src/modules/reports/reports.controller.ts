import type { FastifyReply, FastifyRequest } from "fastify";
import { ReportsService } from "./reports.service";

export class ReportsController {
  constructor(private readonly service = new ReportsService()) {}

  async overview(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }

    return reply.send(await this.service.overview(tenantId));
  }
}
