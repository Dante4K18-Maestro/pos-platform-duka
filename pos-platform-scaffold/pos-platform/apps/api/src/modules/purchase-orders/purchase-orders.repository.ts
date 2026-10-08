// Purchase order data access — Prisma queries, nothing else.
import type { CreatePurchaseOrderInput, PurchaseOrderListItem } from "@pos/contracts";
import { prisma } from "../../db/client";

export interface PurchaseOrdersRepositoryLike {
  list(tenantId: string): Promise<PurchaseOrderListItem[]>;
  findSupplier(tenantId: string, id: string): Promise<{ id: string } | null>;
  findStore(tenantId: string, id: string): Promise<{ id: string } | null>;
  create(tenantId: string, input: CreatePurchaseOrderInput): Promise<{ id: string }>;
}

export class PurchaseOrdersRepository implements PurchaseOrdersRepositoryLike {
  // One row per order. The value is summed from its lines — a stored total
  // would be a second source of truth for a number that is already derivable.
  async list(tenantId: string): Promise<PurchaseOrderListItem[]> {
    const rows = await prisma.purchaseOrder.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        supplier: { select: { name: true } },
        items: { select: { quantityOrdered: true, unitCostMinor: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      supplierId: row.supplierId,
      supplierName: row.supplier.name,
      storeId: row.storeId,
      itemCount: row.items.length,
      totalMinor: row.items.reduce(
        (sum, item) => sum + item.quantityOrdered * item.unitCostMinor,
        0,
      ),
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async findSupplier(tenantId: string, id: string): Promise<{ id: string } | null> {
    return prisma.supplier.findFirst({
      where: { tenantId, id, deletedAt: null },
      select: { id: true },
    });
  }

  async findStore(tenantId: string, id: string): Promise<{ id: string } | null> {
    return prisma.store.findFirst({
      where: { tenantId, id, deletedAt: null },
      select: { id: true },
    });
  }

  // Header + lines in one transaction: a draft order with missing lines is
  // worse than no order at all. Variants are resolved inside the same tx so
  // an unknown variantId fails the whole create, not just one line.
  async create(tenantId: string, input: CreatePurchaseOrderInput): Promise<{ id: string }> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          tenantId,
          storeId: input.storeId,
          supplierId: input.supplierId,
          status: "DRAFT",
        },
        select: { id: true },
      });

      for (const item of input.items) {
        const variant = await tx.variant.findFirst({
          where: { tenantId, id: item.variantId, deletedAt: null },
          select: { id: true },
        });
        if (!variant) {
          throw new Error(`VARIANT_NOT_FOUND:${item.variantId}`);
        }
        await tx.pOItem.create({
          data: {
            purchaseOrderId: order.id,
            variantId: item.variantId,
            quantityOrdered: item.quantityOrdered,
            unitCostMinor: item.unitCostMinor,
          },
        });
      }

      return order;
    });
  }
}
