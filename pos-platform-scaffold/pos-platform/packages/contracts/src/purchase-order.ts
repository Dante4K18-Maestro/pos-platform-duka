import { z } from "zod";

export const purchaseOrderStatusSchema = z.enum([
  "DRAFT",
  "ORDERED",
  "RECEIVED",
  "CANCELLED",
]);

// One row per purchase order: who it is from, what it is worth and how far
// along it is. Line-level detail arrives with the receiving screen.
export const purchaseOrderListItemSchema = z.object({
  id: z.string().uuid(),
  status: purchaseOrderStatusSchema,
  supplierId: z.string().uuid(),
  supplierName: z.string(),
  storeId: z.string().uuid(),
  itemCount: z.number().int().nonnegative(),
  totalMinor: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const purchaseOrdersResponseSchema = z.object({
  purchaseOrders: z.array(purchaseOrderListItemSchema),
});

// POST /purchase-orders — a draft order from the back-office page: pick a
// supplier and a store, then list the variants being restocked. Whole-unit
// quantities, unit cost in minor units. Status always starts at DRAFT; the
// life-cycle transition (draft → ordered → received) is the receiving
// screen's job.
export const purchaseOrderItemInputSchema = z.object({
  variantId: z.string().uuid(),
  quantityOrdered: z.number().int().positive(),
  unitCostMinor: z.number().int().nonnegative(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  storeId: z.string().uuid(),
  items: z.array(purchaseOrderItemInputSchema).min(1, "at least one line is required"),
});

export type PurchaseOrderListItem = z.infer<typeof purchaseOrderListItemSchema>;
export type PurchaseOrdersResponse = z.infer<typeof purchaseOrdersResponseSchema>;
export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemInputSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
