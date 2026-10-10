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
  // Settings shape the business; the till never reads or writes them. (The
  // register gets its tax rate from /catalog's snapshot instead.)
  const guard = { preHandler: [app.authenticate, app.requireRole("owner", "manager")] };

  app.get("/", guard, settingsController.snapshot.bind(settingsController));

  app.patch<{ Body: UpdateBusinessProfileInput }>(
    "/profile",
    { preHandler: [app.authenticate, app.requireRole("owner", "manager"), validateBody(updateBusinessProfileSchema)] },
    settingsController.updateProfile.bind(settingsController),
  );

  app.patch<{ Body: UpdateReceiptSettingsInput }>(
    "/receipts",
    { preHandler: [app.authenticate, app.requireRole("owner", "manager"), validateBody(updateReceiptSettingsSchema)] },
    settingsController.updateReceipts.bind(settingsController),
  );

  app.patch<{ Body: UpdateMpesaSettingsInput }>(
    "/mpesa",
    { preHandler: [app.authenticate, app.requireRole("owner", "manager"), validateBody(updateMpesaSettingsSchema)] },
    settingsController.updateMpesa.bind(settingsController),
  );

  app.get("/taxes", guard, settingsController.listTaxRates.bind(settingsController));

  app.post<{ Body: CreateTaxRateInput }>(
    "/taxes",
    { preHandler: [app.authenticate, app.requireRole("owner", "manager"), validateBody(createTaxRateSchema)] },
    settingsController.createTaxRate.bind(settingsController),
  );

  app.patch<{ Params: { id: string }; Body: UpdateTaxRateInput }>(
    "/taxes/:id",
    { preHandler: [app.authenticate, app.requireRole("owner", "manager"), validateBody(updateTaxRateSchema)] },
    settingsController.updateTaxRate.bind(settingsController),
  );

  app.delete<{ Params: { id: string } }>(
    "/taxes/:id",
    guard,
    settingsController.deleteTaxRate.bind(settingsController),
  );
}
