import { z } from "zod";

export const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});

export type Product = z.infer<typeof productSchema>;
