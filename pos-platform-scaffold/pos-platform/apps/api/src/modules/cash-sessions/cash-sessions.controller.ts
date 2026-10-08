import type {
  CloseCashSessionInput,
  CreateCashMovementInput,
  OpenCashSessionInput,
} from "@pos/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { CashSessionsService } from "./cash-sessions.service";

function unauthorized(reply: FastifyReply) {
  return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
}

export class CashSessionsController {
  constructor(private readonly service = new CashSessionsService()) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    return reply.send(await this.service.list(tenantId));
  }

  async open(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    // The opener is whoever the verified token says it is, never the body.
    const userId = req.user?.sub;
    if (!userId) return unauthorized(reply);
    const session = await this.service.open(tenantId, userId, req.body as OpenCashSessionInput);
    return reply.status(201).send(session);
  }

  async close(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const { id } = req.params as { id: string };
    const session = await this.service.close(tenantId, id, req.body as CloseCashSessionInput);
    return reply.send(session);
  }

  async addMovement(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const { id } = req.params as { id: string };
    const movement = await this.service.addMovement(
      tenantId,
      id,
      req.body as CreateCashMovementInput,
    );
    return reply.status(201).send(movement);
  }
}
