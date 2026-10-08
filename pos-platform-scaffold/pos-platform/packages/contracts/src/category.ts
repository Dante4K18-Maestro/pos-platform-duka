import { z } from "zod";

// A category row as the catalogue admin list renders it: the name, its
// parent (if any) so a tree reads as a flat, indented list, and how many
// products sit directly under it.
//
// createCategorySchema backs POST /categories — the "add category" form on
// the back-office Categories page.
export const categoryListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  parentId: z.string().uuid().nullable(),
  parentName: z.string().nullable(),
  productCount: z.number().int().nonnegative(),
});

export const categoriesResponseSchema = z.object({
  categories: z.array(categoryListItemSchema),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "name is required").max(120),
  // Optional parent, so a tree can be built one level at a time.
  parentId: z.string().uuid().nullable().optional(),
});

export type CategoryListItem = z.infer<typeof categoryListItemSchema>;
export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
