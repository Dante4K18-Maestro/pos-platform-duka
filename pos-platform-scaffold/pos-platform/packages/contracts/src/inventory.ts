import { z } from "zod";

export const stockMovementSchema = z.object({
  variantId: z.string().uuid(),
  quantityDelta: z.number().int(),
  reason: z.enum(["sale", "return", "adjustment", "receipt", "transfer", "waste"]),
});

export type StockMovement = z.infer<typeof stockMovementSchema>;
