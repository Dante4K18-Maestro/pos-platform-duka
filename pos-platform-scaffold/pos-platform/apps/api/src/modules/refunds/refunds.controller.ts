import type { CreateRefundInput } from "@pos/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { RefundsService } from "./refunds.service";

function unauthorized(reply: FastifyReply) {
  return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
}

export class RefundsController {
  constructor(private readonly service = new RefundsService()) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    return reply.send({ refunds: await this.service.list(tenantId) });
  }

  async refundable(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const { saleId } = req.params as { saleId: string };
    return reply.send(await this.service.getRefundable(tenantId, saleId));
  }

  async create(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const { saleId } = req.params as { saleId: string };
    const refund = await this.service.create(tenantId, saleId, req.body as CreateRefundInput);
    return reply.status(201).send(refund);
  }
}
