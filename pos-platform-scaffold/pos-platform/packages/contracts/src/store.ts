// Stores and their registers. The cash-session page needs the register list
// to know what can be opened; a flat `registers` array keeps that page from
// having to walk a nested tree.
import { z } from "zod";

export const storeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});

export const registerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  storeId: z.string().uuid(),
  storeName: z.string().min(1),
});

export const storesResponseSchema = z.object({
  stores: z.array(storeSchema),
  registers: z.array(registerSchema),
});

// POST /stores — the back-office Stores page can add a location. Registers
// (tills) are added per store by the same endpoint with an optional name.
export const createStoreSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(120),
  // Optional: create the store's first till in the same step.
  registerName: z.string().trim().min(1).max(80).optional(),
});

export type Store = z.infer<typeof storeSchema>;
export type Register = z.infer<typeof registerSchema>;
export type StoresResponse = z.infer<typeof storesResponseSchema>;
export type CreateStoreInput = z.infer<typeof createStoreSchema>;
