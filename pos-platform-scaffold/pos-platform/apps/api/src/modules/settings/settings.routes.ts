import {
  createTaxRateSchema,
  updateBusinessProfileSchema,
  updateMpesaSettingsSchema,
  updateReceiptSettingsSchema,
  updateTaxRateSchema,
  type CreateTaxRateInput,
  type UpdateBusinessProfileInput,
  type UpdateMpesaSettingsInput,
  type UpdateReceiptSettingsInput,
  type UpdateTaxRateInput,
} from "@pos/contracts";
import type { FastifyInstance } from "fastify";
import { validateBody } from "../../middleware/validate";
import { SettingsController } from "./settings.controller";

export const settingsController = new SettingsController();

export async function settingsRoutes(app: FastifyInstance) {
  const guard = { preHandler: [app.authenticate] };

  app.get("/", guard, settingsController.snapshot.bind(settingsController));

  app.patch<{ Body: UpdateBusinessProfileInput }>(
    "/profile",
    { preHandler: [app.authenticate, validateBody(updateBusinessProfileSchema)] },
    settingsController.updateProfile.bind(settingsController),
  );

  app.patch<{ Body: UpdateReceiptSettingsInput }>(
    "/receipts",
    { preHandler: [app.authenticate, validateBody(updateReceiptSettingsSchema)] },
    settingsController.updateReceipts.bind(settingsController),
  );

  app.patch<{ Body: UpdateMpesaSettingsInput }>(
    "/mpesa",
    { preHandler: [app.authenticate, validateBody(updateMpesaSettingsSchema)] },
    settingsController.updateMpesa.bind(settingsController),
  );

  app.get("/taxes", guard, settingsController.listTaxRates.bind(settingsController));

  app.post<{ Body: CreateTaxRateInput }>(
    "/taxes",
    { preHandler: [app.authenticate, validateBody(createTaxRateSchema)] },
    settingsController.createTaxRate.bind(settingsController),
  );

  app.patch<{ Params: { id: string }; Body: UpdateTaxRateInput }>(
    "/taxes/:id",
    { preHandler: [app.authenticate, validateBody(updateTaxRateSchema)] },
    settingsController.updateTaxRate.bind(settingsController),
  );

  app.delete<{ Params: { id: string } }>(
    "/taxes/:id",
    guard,
    settingsController.deleteTaxRate.bind(settingsController),
  );
}
