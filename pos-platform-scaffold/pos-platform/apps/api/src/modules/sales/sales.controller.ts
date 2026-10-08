import type { CreateSaleInput as CreateSalePayload, PaymentInput } from "@pos/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { SalesService } from "./sales.service";

export class SalesController {
  constructor(private readonly service = new SalesService()) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }

    // client_id comes from the offline outbox row; the server is idempotent
    // on it, so a retried sync push is a no-op, not a duplicate sale.
    const body = req.body as CreateSalePayload & { payment?: PaymentInput };
    const { payment, ...salePayload } = body;
    const sale = await this.service.createSale({ ...salePayload, tenantId, payment });
    return reply.status(201).send(sale);
  }

  async getById(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }

    const { id } = req.params as { id: string };
    const sale = await this.service.getSale(id, tenantId);
    if (!sale) return reply.status(404).send({ error: { message: "not found", code: "NOT_FOUND" } });
    return reply.send(sale);
  }

  async void(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }

    const { id } = req.params as { id: string };
    const sale = await this.service.voidSale(id, tenantId);
    if (!sale) return reply.status(404).send({ error: { message: "not found", code: "NOT_FOUND" } });
    return reply.send(sale);
  }
}
