import type {
  CreateTaxRateInput,
  UpdateBusinessProfileInput,
  UpdateMpesaSettingsInput,
  UpdateReceiptSettingsInput,
  UpdateTaxRateInput,
} from "@pos/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { SettingsService } from "./settings.service";

function unauthorized(reply: FastifyReply) {
  return reply.status(401).send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
}

export class SettingsController {
  constructor(private readonly service = new SettingsService()) {}

  async snapshot(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    return reply.send(await this.service.getSnapshot(tenantId));
  }

  async updateProfile(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const profile = await this.service.updateProfile(tenantId, req.body as UpdateBusinessProfileInput);
    return reply.send(profile);
  }

  async updateReceipts(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const receipts = await this.service.updateReceipts(
      tenantId,
      req.body as UpdateReceiptSettingsInput,
    );
    return reply.send(receipts);
  }

  async updateMpesa(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const mpesa = await this.service.updateMpesa(tenantId, req.body as UpdateMpesaSettingsInput);
    return reply.send(mpesa);
  }

  async listTaxRates(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    return reply.send({ rates: await this.service.listTaxRates(tenantId) });
  }

  async createTaxRate(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const rate = await this.service.createTaxRate(tenantId, req.body as CreateTaxRateInput);
    return reply.status(201).send(rate);
  }

  async updateTaxRate(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const { id } = req.params as { id: string };
    const rate = await this.service.updateTaxRate(tenantId, id, req.body as UpdateTaxRateInput);
    return reply.send(rate);
  }

  async deleteTaxRate(req: FastifyRequest, reply: FastifyReply) {
    const tenantId = req.tenantId;
    if (!tenantId) return unauthorized(reply);
    const { id } = req.params as { id: string };
    await this.service.deleteTaxRate(tenantId, id);
    return reply.status(204).send();
  }
}
