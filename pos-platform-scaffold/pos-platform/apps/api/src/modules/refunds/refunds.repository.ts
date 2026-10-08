// Refunds data access — Prisma queries, nothing else.
import type { Refund, RefundItem } from "@pos/contracts";
import { prisma, withTransaction } from "../../db/client";

export interface SaleItemForRefund {
  id: string;
  variantId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxMinor: number;
}

export interface SaleForRefund {
  id: string;
  status: string;
  totalMinor: number;
  createdAt: string;
  // From the register, so restocked units land back in the store that sold
  // them rather than in an arbitrary one.
  storeId: string;
  items: SaleItemForRefund[];
}

export interface RefundLineInput {
  saleItemId: string;
  variantId: string;
  name: string;
  quantity: number;
  amountMinor: number;
}

export interface CreateRefundArgs {
  tenantId: string;
  saleId: string;
  storeId: string;
  reason?: string;
  restock: boolean;
  lines: RefundLineInput[];
  fullyRefunded: boolean;
}

export interface RefundsRepositoryLike {
  findSaleForRefund(tenantId: string, saleId: string): Promise<SaleForRefund | null>;
  refundedQuantitiesBySaleItem(saleItemIds: string[]): Promise<Map<string, number>>;
  list(tenantId: string): Promise<Refund[]>;
  create(args: CreateRefundArgs): Promise<Refund>;
}

function toRefund(
  row: {
    id: string;
    saleId: string;
    reason: string | null;
    totalMinor: number;
    createdAt: Date;
    items: {
      saleItemId: string;
      quantity: number;
      amountMinor: number;
      saleItem: { variantId: string; variant: { product: { name: string } } };
    }[];
  },
  restocked: boolean,
): Refund {
  const items: RefundItem[] = row.items.map((item) => ({
    saleItemId: item.saleItemId,
    variantId: item.saleItem.variantId,
    name: item.saleItem.variant.product.name,
    quantity: item.quantity,
    amountMinor: item.amountMinor,
  }));

  return {
    id: row.id,
    saleId: row.saleId,
    reason: row.reason,
    totalMinor: row.totalMinor,
    restocked,
    createdAt: row.createdAt.toISOString(),
    items,
  };
}

const refundInclude = {
  items: {
    include: { saleItem: { include: { variant: { include: { product: true } } } } },
  },
} as const;

export class RefundsRepository implements RefundsRepositoryLike {
  async findSaleForRefund(tenantId: string, saleId: string): Promise<SaleForRefund | null> {
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, tenantId, deletedAt: null },
      include: {
        register: { select: { storeId: true } },
        items: {
          include: { variant: { include: { product: true } } },
        },
      },
    });
    if (!sale) return null;

    return {
      id: sale.id,
      status: sale.status,
      totalMinor: sale.totalMinor,
      createdAt: sale.createdAt.toISOString(),
      storeId: sale.register.storeId,
      items: sale.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        discountMinor: item.discountMinor,
        taxMinor: item.taxMinor,
      })),
    };
  }

  // Everything already refunded, per sale line, in one query — so a second
  // partial refund cannot exceed what was sold.
  async refundedQuantitiesBySaleItem(saleItemIds: string[]): Promise<Map<string, number>> {
    if (saleItemIds.length === 0) return new Map();
    const rows = await prisma.refundItem.findMany({
      where: { saleItemId: { in: saleItemIds }, refund: { deletedAt: null } },
      select: { saleItemId: true, quantity: true },
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.saleItemId, (map.get(row.saleItemId) ?? 0) + row.quantity);
    }
    return map;
  }

  async list(tenantId: string): Promise<Refund[]> {
    const rows = await prisma.refund.findMany({
      where: { tenantId, deletedAt: null },
      include: refundInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    if (rows.length === 0) return [];

    // Whether a refund restocked is read from the ledger that says so, not
    // from a flag that could drift.
    const restocked = await prisma.stockMovement.findMany({
      where: {
        tenantId,
        referenceType: "refund",
        referenceId: { in: rows.map((row) => row.id) },
      },
      select: { referenceId: true },
      distinct: ["referenceId"],
    });
    const restockedIds = new Set(restocked.map((row) => row.referenceId));

    return rows.map((row) => toRefund(row, restockedIds.has(row.id)));
  }

  // Refund + lines + restock ledger in one transaction: a refund that is
  // recorded but not restocked (or the reverse) is a stock count that lies.
  async create(args: CreateRefundArgs): Promise<Refund> {
    const totalMinor = args.lines.reduce((sum, line) => sum + line.amountMinor, 0);

    return withTransaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          tenantId: args.tenantId,
          saleId: args.saleId,
          reason: args.reason ?? null,
          totalMinor,
          items: {
            create: args.lines.map((line) => ({
              saleItemId: line.saleItemId,
              quantity: line.quantity,
              amountMinor: line.amountMinor,
            })),
          },
        },
        include: refundInclude,
      });

      if (args.restock) {
        for (const line of args.lines) {
          await tx.stockMovement.create({
            data: {
              tenantId: args.tenantId,
              storeId: args.storeId,
              variantId: line.variantId,
              quantityDelta: line.quantity,
              reason: "RETURN",
              referenceType: "refund",
              referenceId: refund.id,
            },
          });
          // Keep the read model in step with the ledger it is derived from.
          await tx.inventoryLevel.upsert({
            where: { storeId_variantId: { storeId: args.storeId, variantId: line.variantId } },
            create: {
              tenantId: args.tenantId,
              storeId: args.storeId,
              variantId: line.variantId,
              onHand: line.quantity,
            },
            update: { onHand: { increment: line.quantity } },
          });
        }
      }

      // The sale only reads as REFUNDED once every line is fully back.
      if (args.fullyRefunded) {
        await tx.sale.update({ where: { id: args.saleId }, data: { status: "REFUNDED" } });
      }

      return toRefund(refund, args.restock);
    });
  }
}
