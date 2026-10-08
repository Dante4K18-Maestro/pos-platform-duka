import type { CreateStoreInput } from "@pos/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { StoresService } from "./stores.service";

export class StoresController {
  constructor(private readonly service = new StoresService()) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }
    return reply.send(await this.service.list(tenantId));
  }

  async create(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }
    const body = req.body as CreateStoreInput;
    const created = await this.service.create(tenantId, body);
    return reply.status(201).send(created);
  }
}
