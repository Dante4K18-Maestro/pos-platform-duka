import type { FastifyReply, FastifyRequest } from "fastify";
import { SalesService } from "./sales.service";

export class SalesController {
  private service = new SalesService();

  async create(req: FastifyRequest, reply: FastifyReply) {
    // client_id comes from the offline outbox row; the server is idempotent
    // on it, so a retried sync push is a no-op, not a duplicate sale.
    const sale = await this.service.createSale(req.body as any);
    return reply.status(201).send(sale);
  }

  async getById(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const sale = await this.service.getSale(id);
    if (!sale) return reply.status(404).send({ error: { message: "not found" } });
    return reply.send(sale);
  }

  async void(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const sale = await this.service.voidSale(id);
    return reply.send(sale);
  }
}
