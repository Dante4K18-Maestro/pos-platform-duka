// The source of truth for the API: the client imports this, it never
// hand-writes request/response types. A breaking change becomes a compile
// error before deploy, not a bug report after.
import { z } from "zod";
import { paymentInputSchema } from "./payment";

export const saleItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(), // integer minor units — see @pos/money
  discountMinor: z.number().int().nonnegative().optional(),
});

export const createSaleSchema = z.object({
  clientId: z.string().uuid(),
  registerId: z.string().uuid(),
  items: z.array(saleItemSchema).min(1),
  // Charged in the same gesture as the sale. Must be part of the wire schema:
  // zod strips unknown keys during validation, so a payment declared only on
  // the controller's cast would silently never reach the service.
  payment: paymentInputSchema.optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;
