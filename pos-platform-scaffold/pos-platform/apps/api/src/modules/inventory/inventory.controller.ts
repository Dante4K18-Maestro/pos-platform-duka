import type { FastifyReply, FastifyRequest } from "fastify";
import { InventoryService } from "./inventory.service";

export class InventoryController {
  constructor(private readonly service = new InventoryService()) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }
    return reply.send({ items: await this.service.list(tenantId) });
  }
}
