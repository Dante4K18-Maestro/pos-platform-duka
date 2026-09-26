// The source of truth for the API: the client imports this, it never
// hand-writes request/response types. A breaking change becomes a compile
// error before deploy, not a bug report after.
import { z } from "zod";

export const saleItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(), // integer minor units — see @pos/money
});

export const createSaleSchema = z.object({
  clientId: z.string().uuid(),
  registerId: z.string().uuid(),
  items: z.array(saleItemSchema).min(1),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
