// Inventory data access — Prisma queries, nothing else.
import type { InventoryItem } from "@pos/contracts";
import { prisma } from "../../db/client";

export interface InventoryRepositoryLike {
  list(tenantId: string): Promise<InventoryItem[]>;
}

export class InventoryRepository implements InventoryRepositoryLike {
  // Same shape the register grid uses, plus the latest stock update per
  // variant. Per-store breakdown and reorder points arrive with purchasing.
  async list(tenantId: string): Promise<InventoryItem[]> {
    const variants = await prisma.variant.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        product: { include: { category: true } },
        inventoryLevels: { orderBy: { updatedAt: "desc" } },
      },
      orderBy: { createdAt: "asc" },
    });

    return variants.map((variant) => ({
      variantId: variant.id,
      name: variant.product.name,
      sku: variant.sku,
      categoryName: variant.product.category?.name ?? null,
      onHand: variant.inventoryLevels.reduce((sum, level) => sum + level.onHand, 0),
      priceMinor: variant.priceMinor,
      imageUrl: variant.product.imageUrl ?? null,
      updatedAt:
        variant.inventoryLevels[0]?.updatedAt.toISOString() ?? null,
    }));
  }
}
