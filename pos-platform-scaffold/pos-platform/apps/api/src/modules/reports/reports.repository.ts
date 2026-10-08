// Reports data access — Prisma queries, nothing else.
import { prisma } from "../../db/client";
import type { ReportTransaction } from "@pos/contracts";

export interface ReportsOverviewData {
  totalSalesMinor: number;
  orderCount: number;
  customerCount: number;
  lowStockCount: number;
  recentTransactions: ReportTransaction[];
}

export interface ReportsRepositoryLike {
  overview(tenantId: string, startOfToday: Date): Promise<ReportsOverviewData>;
}

export class ReportsRepository implements ReportsRepositoryLike {
  async overview(tenantId: string, startOfToday: Date): Promise<ReportsOverviewData> {
    // A sale with at least one non-voided payment contributes to "sales
    // today"; the payment join also decides which method label to show.
    const sales = await prisma.sale.findMany({
      where: { tenantId, deletedAt: null, createdAt: { gte: startOfToday } },
      include: { payments: { where: { deletedAt: null } } },
      orderBy: { createdAt: "desc" },
    });

    const recent = sales.slice(0, 8).map<ReportTransaction>((sale) => {
      const payment = sale.payments[0];
      return {
        id: sale.id,
        createdAt: sale.createdAt.toISOString(),
        method: payment?.method ?? null,
        paymentStatus: payment?.status ?? null,
        totalMinor: sale.totalMinor,
      };
    });

    const totalSalesMinor = sales
      .filter((sale) => sale.payments.some((payment) => payment.status !== "FAILED"))
      .reduce((sum, sale) => sum + sale.totalMinor, 0);

    const [customerCount, lowStockCount] = await Promise.all([
      prisma.customer.count({ where: { tenantId, deletedAt: null } }),
      // Reorder points arrive with purchasing; low stock is on-hand ≤ 5.
      prisma.inventoryLevel.count({ where: { tenantId, onHand: { lte: 5 } } }),
    ]);

    return {
      totalSalesMinor,
      orderCount: sales.length,
      customerCount,
      lowStockCount,
      recentTransactions: recent,
    };
  }
}
