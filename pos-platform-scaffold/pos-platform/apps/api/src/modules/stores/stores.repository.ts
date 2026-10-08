// Stores data access — Prisma queries, nothing else.
import type { Register, Store, StoresResponse } from "@pos/contracts";
import { prisma } from "../../db/client";

export interface StoresRepositoryLike {
  list(tenantId: string): Promise<StoresResponse>;
  create(tenantId: string, storeName: string, registerName: string): Promise<{ id: string }>;
}

export class StoresRepository implements StoresRepositoryLike {
  async list(tenantId: string): Promise<StoresResponse> {
    const rows = await prisma.store.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        registers: { where: { deletedAt: null }, orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    });

    const stores: Store[] = rows.map((row) => ({ id: row.id, name: row.name }));
    const registers: Register[] = rows.flatMap((row) =>
      row.registers.map((register) => ({
        id: register.id,
        name: register.name,
        storeId: row.id,
        storeName: row.name,
      })),
    );

    return { stores, registers };
  }

  // One transaction: the store and its first till land together or not at
  // all, so the UI never shows a store with a phantom missing register.
  async create(tenantId: string, storeName: string, registerName: string): Promise<{ id: string }> {
    return prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: { tenantId, name: storeName },
        select: { id: true },
      });
      await tx.register.create({
        data: { tenantId, storeId: store.id, name: registerName },
      });
      return store;
    });
  }
}
