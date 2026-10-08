import type { CreateSupplierInput } from "@pos/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { SuppliersService } from "./suppliers.service";

export class SuppliersController {
  constructor(private readonly service = new SuppliersService()) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }
    return reply.send({ suppliers: await this.service.list(tenantId) });
  }

  async create(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }
    const body = req.body as CreateSupplierInput;
    const created = await this.service.create(tenantId, body);
    return reply.status(201).send(created);
  }
}
