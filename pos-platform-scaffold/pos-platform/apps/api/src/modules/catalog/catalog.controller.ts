import type { FastifyReply, FastifyRequest } from "fastify";
import { CatalogService } from "./catalog.service";

export class CatalogController {
  constructor(private readonly service = new CatalogService()) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }

    return reply.send(await this.service.getRegisterCatalog(tenantId));
  }
}
