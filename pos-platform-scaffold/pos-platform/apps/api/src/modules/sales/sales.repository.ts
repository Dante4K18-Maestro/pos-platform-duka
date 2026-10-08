import type { SaleTotals } from "@pos/money";
import { prisma, withTransaction } from "../../db/client";
import type { CreateSaleInput } from "./sales.service";

// Domain shapes, not Prisma types. The service depends on this contract
// rather than on the client, so it can be unit-tested against a double with
// no database and no generated client in the loop.
export interface SaleItemRecord {
  id: string;
  variantId: string;
  quantity: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxMinor: number;
}

export interface SaleRecord {
  id: string;
  tenantId: string;
  clientId: string;
  registerId: string;
  status: string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  items?: SaleItemRecord[];
  payments?: unknown[];
}

export interface SalesRepositoryLike {
  findByClientId(clientId: string): Promise<SaleRecord | null>;
  resolveTaxRateBasisPoints(tenantId: string): Promise<number>;
  // The register's currently open drawer, if a cashier has opened one.
  findOpenCashSessionId(tenantId: string, registerId: string): Promise<string | null>;
  create(input: CreateSaleInput & { totals: SaleTotals; cashSessionId?: string | null }): Promise<SaleRecord>;
  findById(id: string, tenantId: string): Promise<SaleRecord | null>;
  markVoided(id: string, tenantId: string): Promise<SaleRecord | null>;
}

export class SalesRepository implements SalesRepositoryLike {
  async findByClientId(clientId: string): Promise<SaleRecord | null> {
    return prisma.sale.findUnique({
      where: { clientId },
      include: { items: true, payments: true },
    });
  }

  // Tax is resolved server-side at sale time and stored on the line. Until
  // variants carry a tax-rate link, the tenant's earliest active rate is the
  // best available resolution; a tenant with no rate is genuinely 0%, not a
  // placeholder that pretends tax was applied.
  async resolveTaxRateBasisPoints(tenantId: string): Promise<number> {
    const rate = await prisma.taxRate.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    return rate?.rateBasisPoints ?? 0;
  }

  async findOpenCashSessionId(tenantId: string, registerId: string): Promise<string | null> {
    const session = await prisma.cashSession.findFirst({
      where: { tenantId, registerId, deletedAt: null, closedAt: null },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    return session?.id ?? null;
  }

  // The sale, its stock-ledger entries and the derived on-hand counters move
  // together. A sale that didn't decrement stock would make the inventory tab
  // a lie, and would make a later refund inflate the shelf.
  async create(
    input: CreateSaleInput & { totals: SaleTotals; cashSessionId?: string | null },
  ): Promise<SaleRecord> {
    return withTransaction(async (tx) => {
      const register = await tx.register.findFirst({
        where: { id: input.registerId, tenantId: input.tenantId },
        select: { storeId: true },
      });

      const sale = await tx.sale.create({
        data: {
          tenantId: input.tenantId,
          clientId: input.clientId,
          registerId: input.registerId,
          cashSessionId: input.cashSessionId ?? null,
          status: "COMPLETED",
          subtotalMinor: input.totals.subtotalMinor,
          taxMinor: input.totals.taxMinor,
          discountMinor: input.totals.discountMinor,
          totalMinor: input.totals.totalMinor,
          items: {
            create: input.items.map((item, index) => ({
              tenantId: input.tenantId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPriceMinor: item.unitPrice,
              discountMinor: item.discountMinor ?? 0,
              // The tax actually charged on this line, resolved at sale time
              // and stored so the historical charge survives a rate change.
              taxMinor: input.totals.lines[index].taxMinor,
            })),
          },
        },
        include: { items: true },
      });

      if (register) {
        for (const item of input.items) {
          await tx.stockMovement.create({
            data: {
              tenantId: input.tenantId,
              storeId: register.storeId,
              variantId: item.variantId,
              quantityDelta: -item.quantity,
              reason: "SALE",
              referenceType: "sale",
              referenceId: sale.id,
            },
          });
          await tx.inventoryLevel.upsert({
            where: {
              storeId_variantId: { storeId: register.storeId, variantId: item.variantId },
            },
            create: {
              tenantId: input.tenantId,
              storeId: register.storeId,
              variantId: item.variantId,
              onHand: -item.quantity,
            },
            update: { onHand: { decrement: item.quantity } },
          });
        }
      }

      return sale;
    });
  }

  // Tenant-scoped: an id alone must never fetch another tenant's row.
  async findById(id: string, tenantId: string): Promise<SaleRecord | null> {
    return prisma.sale.findFirst({
      where: { id, tenantId },
      include: { items: true, payments: true },
    });
  }

  async markVoided(id: string, tenantId: string): Promise<SaleRecord | null> {
    const existing = await prisma.sale.findFirst({ where: { id, tenantId } });
    if (!existing) return null;

    return prisma.sale.update({
      where: { id },
      data: { status: "VOIDED" },
    });
  }
}
