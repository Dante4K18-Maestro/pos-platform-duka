import type { CreateCategoryInput } from "@pos/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { CategoriesService } from "./categories.service";

export class CategoriesController {
  constructor(private readonly service = new CategoriesService()) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }
    return reply.send({ categories: await this.service.list(tenantId) });
  }

  async create(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }
    const body = req.body as CreateCategoryInput;
    const created = await this.service.create(tenantId, body);
    return reply.status(201).send(created);
  }
}
