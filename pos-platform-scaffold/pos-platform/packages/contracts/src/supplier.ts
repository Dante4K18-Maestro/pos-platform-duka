import { z } from "zod";

// Suppliers and their order volume. contactInfo is free-form JSON on the
// model, so the contract keeps it opaque rather than inventing a schema the
// data does not yet have.
export const supplierListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  contactInfo: z.unknown().nullable(),
  purchaseOrderCount: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const suppliersResponseSchema = z.object({
  suppliers: z.array(supplierListItemSchema),
});

// The list keeps contactInfo opaque, but the create form is a fixed shape:
// a name plus optional email/phone. The repository serialises it into the
// same JSON blob the seed writes ({ email, phone }).
export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(160),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(20).optional(),
});

export type SupplierListItem = z.infer<typeof supplierListItemSchema>;
export type SuppliersResponse = z.infer<typeof suppliersResponseSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
