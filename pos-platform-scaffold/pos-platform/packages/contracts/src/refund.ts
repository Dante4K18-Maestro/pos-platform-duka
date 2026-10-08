// Refunds: money back against a sale, line by line. A refund may be partial
// (some quantity of some lines) and optionally restocks what comes back.
import { z } from "zod";

export const refundItemSchema = z.object({
  saleItemId: z.string().uuid(),
  variantId: z.string().uuid(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  amountMinor: z.number().int().nonnegative(),
});

export type RefundItem = z.infer<typeof refundItemSchema>;

export const refundSchema = z.object({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  reason: z.string().nullable(),
  totalMinor: z.number().int().nonnegative(),
  restocked: z.boolean(),
  createdAt: z.string(),
  items: z.array(refundItemSchema),
});

export type Refund = z.infer<typeof refundSchema>;

export const refundsResponseSchema = z.object({
  refunds: z.array(refundSchema),
});

// How much of each line is still refundable, for the "refund this sale" form.
export const refundableItemSchema = z.object({
  saleItemId: z.string().uuid(),
  variantId: z.string().uuid(),
  name: z.string().min(1),
  soldQuantity: z.number().int().positive(),
  refundedQuantity: z.number().int().nonnegative(),
  refundableQuantity: z.number().int().nonnegative(),
  unitPriceMinor: z.number().int().nonnegative(),
});

export const refundableSaleSchema = z.object({
  saleId: z.string().uuid(),
  totalMinor: z.number().int().nonnegative(),
  createdAt: z.string(),
  items: z.array(refundableItemSchema),
});

export type RefundableSale = z.infer<typeof refundableSaleSchema>;

export const createRefundSchema = z.object({
  items: z
    .array(
      z.object({
        saleItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, "select at least one line to refund"),
  reason: z.string().trim().max(200).optional(),
  // Put the returned stock back on the shelf. Defaults to true.
  restock: z.boolean().optional(),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;
