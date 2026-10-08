import { z } from "zod";

// What the register grid renders per sellable variant. onHand is the sum of
// the variant's inventory levels; per-store selection arrives with store
// context on the session.
export const catalogProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().nullable(),
  priceMinor: z.number().int().nonnegative(),
  categoryName: z.string().nullable(),
  onHand: z.number().int(),
  // Descriptive product picture from a copyright-free host; null falls back
  // to a category glyph tile in the UI.
  imageUrl: z.string().nullable(),
});

export type CatalogProduct = z.infer<typeof catalogProductSchema>;

export const catalogResponseSchema = z.object({
  products: z.array(catalogProductSchema),
  // The register's pre-charge totals must use the same rate the server will
  // resolve at sale time, or the till and the receipt disagree.
  taxRateBasisPoints: z.number().int().nonnegative(),
});

export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
