import type { CreateCustomerInput } from "@pos/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { CustomersService } from "./customers.service";

export class CustomersController {
  constructor(private readonly service = new CustomersService()) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }
    return reply.send({ customers: await this.service.list(tenantId) });
  }

  async create(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }
    const body = req.body as CreateCustomerInput;
    const created = await this.service.create(tenantId, body);
    return reply.status(201).send(created);
  }
}
