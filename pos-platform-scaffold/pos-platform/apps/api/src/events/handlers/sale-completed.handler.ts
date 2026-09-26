// sale.completed → stock movement, receipt generation, low-stock alert check.
import { bus } from "../bus";

bus.on("sale.completed", async (_sale: unknown) => {
  // TODO: write stock_movements rows, enqueue receipt, check reorder points
});
