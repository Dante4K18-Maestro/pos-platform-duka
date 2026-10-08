import { z } from "zod";

export const reportTransactionSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  method: z.string().nullable(),
  paymentStatus: z.string().nullable(),
  totalMinor: z.number().int(),
});

// What the dashboard header reads. "Today" is resolved server-side so every
// client agrees on the window.
export const reportsOverviewSchema = z.object({
  totalSalesMinor: z.number().int(),
  orderCount: z.number().int(),
  customerCount: z.number().int(),
  lowStockCount: z.number().int(),
  recentTransactions: z.array(reportTransactionSchema),
});

export type ReportsOverview = z.infer<typeof reportsOverviewSchema>;
export type ReportTransaction = z.infer<typeof reportTransactionSchema>;
