// Customers data access — Prisma queries, nothing else.
import type { CreateCustomerInput, CustomerSummary } from "@pos/contracts";
import { prisma } from "../../db/client";

export interface CustomersRepositoryLike {
  list(tenantId: string): Promise<CustomerSummary[]>;
  findByPhone(tenantId: string, phone: string): Promise<{ id: string } | null>;
  create(tenantId: string, input: CreateCustomerInput): Promise<{ id: string }>;
}

export class CustomersRepository implements CustomersRepositoryLike {
  // List + aggregates in one pass: sales are tiny at this scale and the
  // tab renders a mini account view per row (orders + lifetime spend).
  async list(tenantId: string): Promise<CustomerSummary[]> {
    const rows = await prisma.customer.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        sales: {
          where: { deletedAt: null, status: { not: "VOIDED" } },
          select: { totalMinor: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      orderCount: row.sales.length,
      spendMinor: row.sales.reduce((sum, sale) => sum + sale.totalMinor, 0),
      createdAt: row.createdAt.toISOString(),
    }));
  }

  // Phone is the practical unique handle for walk-in customers.
  async findByPhone(tenantId: string, phone: string): Promise<{ id: string } | null> {
    return prisma.customer.findFirst({
      where: { tenantId, deletedAt: null, phone },
      select: { id: true },
    });
  }

  async create(tenantId: string, input: CreateCustomerInput): Promise<{ id: string }> {
    return prisma.customer.create({
      data: {
        tenantId,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
      },
      select: { id: true },
    });
  }
}
