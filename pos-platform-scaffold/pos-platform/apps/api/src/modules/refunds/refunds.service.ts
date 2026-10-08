// Refund rules live here, and only here. The refunded amount mirrors what the
// customer actually paid for that quantity — including the tax that was
// charged — and never more than what is still refundable on that line.
import type { CreateRefundInput, Refund, RefundableSale } from "@pos/contracts";
import {
  RefundsRepository,
  type RefundLineInput,
  type RefundsRepositoryLike,
  type SaleItemForRefund,
} from "./refunds.repository";

export class RefundSaleNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = "SALE_NOT_FOUND";
  constructor() {
    super("sale not found");
  }
}

export class RefundValidationError extends Error {
  readonly statusCode = 400;
  readonly code: string;
  constructor(message: string, code = "REFUND_INVALID") {
    super(message);
    this.code = code;
  }
}

// Split the line's discount and tax across the refunded quantity using the
// same half-up rounding the sale used, so a partial refund of a 3-for-2 line
// doesn't refund a penny more than was charged.
export function lineRefundAmount(item: SaleItemForRefund, quantity: number): number {
  const share = (value: number) => Math.round((value * quantity) / item.quantity);
  return item.unitPriceMinor * quantity - share(item.discountMinor) + share(item.taxMinor);
}

export class RefundsService {
  constructor(private readonly repo: RefundsRepositoryLike = new RefundsRepository()) {}

  async list(tenantId: string): Promise<Refund[]> {
    return this.repo.list(tenantId);
  }

  async getRefundable(tenantId: string, saleId: string): Promise<RefundableSale> {
    const sale = await this.repo.findSaleForRefund(tenantId, saleId);
    if (!sale) throw new RefundSaleNotFoundError();

    const already = await this.repo.refundedQuantitiesBySaleItem(sale.items.map((i) => i.id));

    return {
      saleId: sale.id,
      totalMinor: sale.totalMinor,
      createdAt: sale.createdAt,
      items: sale.items.map((item) => {
        const refunded = already.get(item.id) ?? 0;
        return {
          saleItemId: item.id,
          variantId: item.variantId,
          name: item.productName,
          soldQuantity: item.quantity,
          refundedQuantity: refunded,
          // Clamped: a data wobble must never show a negative to refund.
          refundableQuantity: Math.max(0, item.quantity - refunded),
          unitPriceMinor: item.unitPriceMinor,
        };
      }),
    };
  }

  async create(tenantId: string, saleId: string, input: CreateRefundInput): Promise<Refund> {
    const sale = await this.repo.findSaleForRefund(tenantId, saleId);
    if (!sale) throw new RefundSaleNotFoundError();
    if (sale.status === "VOIDED") {
      throw new RefundValidationError("a voided sale cannot be refunded", "SALE_VOIDED");
    }

    const already = await this.repo.refundedQuantitiesBySaleItem(sale.items.map((i) => i.id));
    const byId = new Map(sale.items.map((item) => [item.id, item]));

    // Duplicate lines in one request are summed before the limit check, so
    // two "1 of 1" rows can't sneak past as two separate refunds.
    const requested = new Map<string, number>();
    for (const line of input.items) {
      requested.set(line.saleItemId, (requested.get(line.saleItemId) ?? 0) + line.quantity);
    }

    const lines: RefundLineInput[] = [];
    for (const [saleItemId, quantity] of requested) {
      const item = byId.get(saleItemId);
      if (!item) {
        throw new RefundValidationError(
          "refund line does not belong to this sale",
          "ITEM_NOT_IN_SALE",
        );
      }
      const refundable = item.quantity - (already.get(saleItemId) ?? 0);
      if (quantity > refundable) {
        throw new RefundValidationError(
          `only ${refundable} of ${item.productName} can still be refunded`,
          "EXCEEDS_REFUNDABLE",
        );
      }
      lines.push({
        saleItemId,
        variantId: item.variantId,
        name: item.productName,
        quantity,
        amountMinor: lineRefundAmount(item, quantity),
      });
    }

    // Fully refunded once every line is back on the shelf.
    const fullyRefunded = sale.items.every((item) => {
      const refunded = (already.get(item.id) ?? 0) + (requested.get(item.id) ?? 0);
      return refunded >= item.quantity;
    });

    return this.repo.create({
      tenantId,
      saleId: sale.id,
      storeId: sale.storeId,
      reason: input.reason,
      restock: input.restock ?? true,
      lines,
      fullyRefunded,
    });
  }
}
