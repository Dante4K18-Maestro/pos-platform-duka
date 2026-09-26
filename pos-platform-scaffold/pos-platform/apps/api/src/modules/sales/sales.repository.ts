import { prisma } from "../../db/client";
import type { CreateSaleInput } from "./sales.service";

export class SalesRepository {
  async findByClientId(clientId: string) {
    return prisma.sale.findUnique({
      where: { clientId },
      include: { items: true, payments: true },
    });
  }

  async create(
    input: CreateSaleInput & {
      tenantId: string;
      totals: {
        subtotalMinor: number;
        taxMinor: number;
        discountMinor: number;
        totalMinor: number;
      };
    },
  ) {
    return prisma.sale.create({
      data: {
        tenantId: input.tenantId,
        clientId: input.clientId,
        registerId: input.registerId,
        status: "COMPLETED",
        subtotalMinor: input.totals.subtotalMinor,
        taxMinor: input.totals.taxMinor,
        discountMinor: input.totals.discountMinor,
        totalMinor: input.totals.totalMinor,
        items: {
          create: input.items.map((item) => ({
            tenantId: input.tenantId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPriceMinor: item.unitPrice,
            // TODO: resolve real tax at sale time from the variant's tax
            // rate once tax_rates are wired to products; 0 until then.
            taxMinor: 0,
          })),
        },
      },
      include: { items: true },
    });
  }

  async findById(id: string) {
    return prisma.sale.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });
  }

  async markVoided(id: string) {
    return prisma.sale.update({
      where: { id },
      data: { status: "VOIDED" },
    });
  }
}
