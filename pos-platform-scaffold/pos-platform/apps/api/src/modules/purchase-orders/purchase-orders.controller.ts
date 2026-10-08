import type { CreatePurchaseOrderInput } from "@pos/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { PurchaseOrdersService } from "./purchase-orders.service";

export class PurchaseOrdersController {
  constructor(private readonly service = new PurchaseOrdersService()) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }
    return reply.send({ purchaseOrders: await this.service.list(tenantId) });
  }

  async create(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }
    const body = req.body as CreatePurchaseOrderInput;
    const created = await this.service.create(tenantId, body);
    return reply.status(201).send(created);
  }
}
