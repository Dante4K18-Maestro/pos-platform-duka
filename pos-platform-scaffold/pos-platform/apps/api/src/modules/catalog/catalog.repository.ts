// Catalog data access — Prisma queries, nothing else.
import { prisma } from "../../db/client";
import type { CatalogProduct } from "@pos/contracts";

export interface CatalogRepositoryLike {
  listProducts(tenantId: string): Promise<CatalogProduct[]>;
  resolveTaxRateBasisPoints(tenantId: string): Promise<number>;
}

export class CatalogRepository implements CatalogRepositoryLike {
  // One query for the whole register grid: variants with their product,
  // category name and summed on-hand. Kept flat on purpose — the register
  // renders cards, it does not walk the category tree.
  async listProducts(tenantId: string): Promise<CatalogProduct[]> {
    const variants = await prisma.variant.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        product: { include: { category: true } },
        inventoryLevels: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return variants.map((variant) => ({
      id: variant.id,
      name: variant.product.name,
      sku: variant.sku,
      barcode: variant.barcode,
      priceMinor: variant.priceMinor,
      categoryName: variant.product.category?.name ?? null,
      onHand: variant.inventoryLevels.reduce((sum, level) => sum + level.onHand, 0),
      imageUrl: variant.product.imageUrl ?? null,
    }));
  }

  // Same resolution rule as the sales repository: earliest active tenant
  // rate, 0 when the tenant has none.
  async resolveTaxRateBasisPoints(tenantId: string): Promise<number> {
    const rate = await prisma.taxRate.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    return rate?.rateBasisPoints ?? 0;
  }
}
