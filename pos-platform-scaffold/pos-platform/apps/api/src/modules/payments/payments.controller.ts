import type { MpesaCallbackBody, PaymentInput } from "@pos/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { PaymentsService } from "./payments.service";

function unauthorized(reply: FastifyReply) {
  return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
}

export class PaymentsController {
  constructor(private readonly service = new PaymentsService()) {}

  async record(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const { saleId } = req.params as { saleId: string };
    const payment = await this.service.record(saleId, tenantId, req.body as PaymentInput);
    return reply.status(201).send(payment);
  }

  // Public by necessity: Safaricom carries no bearer token. It is safe
  // because the handler only ever matches an existing processorReference and
  // cannot create anything — an unknown reference is simply ignored.
  async mpesaCallback(req: FastifyRequest, reply: FastifyReply) {
    const outcome = await this.service.handleCallback(req.body as MpesaCallbackBody);
    // Daraja retries until it sees a 200, so acknowledge even an unmatched
    // callback — otherwise it keeps calling back about nothing.
    return reply.send({ ResultCode: 0, ResultDesc: "Accepted", ...outcome });
  }

  async simulate(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const { paymentId } = req.params as { paymentId: string };
    const payment = await this.service.simulateConfirmation(tenantId, paymentId);
    return reply.send(payment);
  }
}
