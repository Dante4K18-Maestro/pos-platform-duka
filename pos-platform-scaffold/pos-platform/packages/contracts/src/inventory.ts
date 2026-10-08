import { z } from "zod";

// Stock position per variant as the inventory tab renders it. onHand is the
// sum across stores; per-store levels arrive with the purchasing slice.
export const inventoryItemSchema = z.object({
  variantId: z.string().uuid(),
  name: z.string().min(1),
  sku: z.string().min(1),
  categoryName: z.string().nullable(),
  onHand: z.number().int(),
  priceMinor: z.number().int().nonnegative(),
  // Descriptive product picture from a copyright-free host; null falls back
  // to a category glyph tile in the UI.
  imageUrl: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const inventoryListSchema = z.object({
  items: z.array(inventoryItemSchema),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
