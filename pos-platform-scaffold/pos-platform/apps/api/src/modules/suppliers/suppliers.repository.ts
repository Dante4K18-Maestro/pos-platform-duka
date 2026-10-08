// Suppliers data access — Prisma queries, nothing else.
import type { SupplierListItem } from "@pos/contracts";
import { prisma } from "../../db/client";

export interface SuppliersRepositoryLike {
  list(tenantId: string): Promise<SupplierListItem[]>;
  create(
    tenantId: string,
    name: string,
    contactInfo: Record<string, string>,
  ): Promise<{ id: string }>;
}

export class SuppliersRepository implements SuppliersRepositoryLike {
  async list(tenantId: string): Promise<SupplierListItem[]> {
    const rows = await prisma.supplier.findMany({
      where: { tenantId, deletedAt: null },
      include: { _count: { select: { purchaseOrders: true } } },
      orderBy: { name: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      contactInfo: row.contactInfo ?? null,
      purchaseOrderCount: row._count.purchaseOrders,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async create(
    tenantId: string,
    name: string,
    contactInfo: Record<string, string>,
  ): Promise<{ id: string }> {
    return prisma.supplier.create({
      data: {
        tenantId,
        name,
        contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
      },
      select: { id: true },
    });
  }
}
