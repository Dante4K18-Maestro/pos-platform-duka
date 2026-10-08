import { z } from "zod";

// Customer row as the CRM tab renders it. spendMinor aggregates the
// customer's non-voided sales so the list reads like a mini account view.
export const customerSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  orderCount: z.number().int().nonnegative(),
  spendMinor: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const customersListSchema = z.object({
  customers: z.array(customerSummarySchema),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(120),
  // Kenyan MSISDN stored in 2547XXXXXXXX form; optional.
  phone: z
    .string()
    .regex(/^254[17]\d{8}$/, "must be a Kenyan number in 2547XXXXXXXX format")
    .optional(),
  email: z.string().trim().email().optional(),
});

export type CustomerSummary = z.infer<typeof customerSummarySchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
