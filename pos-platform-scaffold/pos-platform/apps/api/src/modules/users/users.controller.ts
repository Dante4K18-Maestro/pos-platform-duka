import type { CreateStaffInput, UpdateStaffInput } from "@pos/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { UsersService } from "./users.service";

function unauthorized(reply: FastifyReply) {
  return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
}

export class UsersController {
  constructor(private readonly service = new UsersService()) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    return reply.send(await this.service.list(tenantId));
  }

  async create(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const member = await this.service.create(tenantId, req.body as CreateStaffInput);
    return reply.status(201).send(member);
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const { id } = req.params as { id: string };
    const member = await this.service.update(tenantId, id, req.body as UpdateStaffInput);
    return reply.send(member);
  }
}
