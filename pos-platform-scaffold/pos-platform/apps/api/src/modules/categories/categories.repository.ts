// Categories data access — Prisma queries, nothing else.
import type { CategoryListItem, CreateCategoryInput } from "@pos/contracts";
import { prisma } from "../../db/client";

export interface CategoriesRepositoryLike {
  list(tenantId: string): Promise<CategoryListItem[]>;
  findById(tenantId: string, id: string): Promise<{ id: string } | null>;
  create(tenantId: string, input: CreateCategoryInput): Promise<{ id: string }>;
}

export class CategoriesRepository implements CategoriesRepositoryLike {
  // Flat list with the parent's name resolved and a direct product count, so
  // the admin screen can indent a tree without a second round-trip.
  async list(tenantId: string): Promise<CategoryListItem[]> {
    const rows = await prisma.category.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        parent: { select: { name: true } },
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      parentName: row.parent?.name ?? null,
      productCount: row._count.products,
    }));
  }

  async findById(tenantId: string, id: string): Promise<{ id: string } | null> {
    return prisma.category.findFirst({
      where: { tenantId, id, deletedAt: null },
      select: { id: true },
    });
  }

  async create(tenantId: string, input: CreateCategoryInput): Promise<{ id: string }> {
    return prisma.category.create({
      data: {
        tenantId,
        name: input.name,
        parentId: input.parentId ?? null,
      },
      select: { id: true },
    });
  }
}
