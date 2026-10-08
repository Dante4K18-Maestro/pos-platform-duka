// Tenant settings: tax rates (real rows), business profile, receipts and
// M-Pesa configuration. The non-tax blobs live in Tenant.featureFlags — the
// one JSON column the tenant already carries — so no schema migration is
// needed and a new setting ships without a database change.
import { z } from "zod";

// ---------------------------------------------------------------------
// Taxes — one row per rate, VAT seeded at 1600 basis points (16%)
// ---------------------------------------------------------------------

export const taxRateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  rateBasisPoints: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const taxRatesResponseSchema = z.object({
  rates: z.array(taxRateSchema),
});

// 10000 bps = 100%; a "rate" above that is a typo, not a tax.
export const createTaxRateSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(80),
  rateBasisPoints: z.number().int().min(0).max(10000),
});

export const updateTaxRateSchema = createTaxRateSchema.partial();

export type TaxRate = z.infer<typeof taxRateSchema>;
export type CreateTaxRateInput = z.infer<typeof createTaxRateSchema>;
export type UpdateTaxRateInput = z.infer<typeof updateTaxRateSchema>;

// ---------------------------------------------------------------------
// Business profile
// ---------------------------------------------------------------------

export const businessProfileSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  currency: z.string().min(1),
  timezone: z.string().min(1),
});

export const updateBusinessProfileSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(120).optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
});

export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;

// ---------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------

export const receiptSettingsSchema = z.object({
  headerText: z.string().max(200),
  footerText: z.string().max(300),
  showTaxBreakdown: z.boolean(),
  printAutomatically: z.boolean(),
});

export const updateReceiptSettingsSchema = receiptSettingsSchema.partial();

export type ReceiptSettings = z.infer<typeof receiptSettingsSchema>;
export type UpdateReceiptSettingsInput = z.infer<typeof updateReceiptSettingsSchema>;

// ---------------------------------------------------------------------
// M-Pesa
// ---------------------------------------------------------------------

// Secrets (consumer key/secret, passkey) live only in server env — this is
// what the merchant sees and can edit. `configured` reports whether the
// server actually holds usable credentials, so the UI can say "not wired up"
// instead of pretending a push would go out.
export const mpesaSettingsSchema = z.object({
  shortcode: z.string().max(20),
  paybillType: z.enum(["PAYBILL", "TILL"]),
  environment: z.enum(["sandbox", "production"]),
  configured: z.boolean(),
  callbackUrl: z.string(),
});

export const updateMpesaSettingsSchema = z.object({
  shortcode: z.string().trim().max(20).optional(),
  paybillType: z.enum(["PAYBILL", "TILL"]).optional(),
  environment: z.enum(["sandbox", "production"]).optional(),
});

export type MpesaSettings = z.infer<typeof mpesaSettingsSchema>;
export type UpdateMpesaSettingsInput = z.infer<typeof updateMpesaSettingsSchema>;

// ---------------------------------------------------------------------
// One response the settings hub can fetch in a single round trip
// ---------------------------------------------------------------------

export const settingsSnapshotSchema = z.object({
  profile: businessProfileSchema,
  receipts: receiptSettingsSchema,
  mpesa: mpesaSettingsSchema,
});

export type SettingsSnapshot = z.infer<typeof settingsSnapshotSchema>;
