import { describe, expect, it, vi } from "vitest";
import type { RefundsRepositoryLike, SaleForRefund } from "./refunds.repository";
import {
  lineRefundAmount,
  RefundSaleNotFoundError,
  RefundValidationError,
  RefundsService,
} from "./refunds.service";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const SALE_ID = "22222222-2222-2222-2222-222222222222";
const ITEM_ID = "33333333-3333-3333-3333-333333333333";
const VARIANT_ID = "44444444-4444-4444-4444-444444444444";

// Three units at 100.00 each, 0 discount, 48.00 tax charged on the line.
function sale(overrides: Partial<SaleForRefund> = {}): SaleForRefund {
  return {
    id: SALE_ID,
    status: "COMPLETED",
    totalMinor: 34800,
    createdAt: "2026-10-07T09:00:00.000Z",
    storeId: "55555555-5555-5555-5555-555555555555",
    items: [
      {
        id: ITEM_ID,
        variantId: VARIANT_ID,
        productName: "500ml Soda",
        quantity: 3,
        unitPriceMinor: 10000,
        discountMinor: 0,
        taxMinor: 4800,
      },
    ],
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<RefundsRepositoryLike> = {}): RefundsRepositoryLike {
  return {
    findSaleForRefund: vi.fn().mockResolvedValue(sale()),
    refundedQuantitiesBySaleItem: vi.fn().mockResolvedValue(new Map()),
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({
      id: "refund-1",
      saleId: SALE_ID,
      reason: null,
      totalMinor: 11600,
      restocked: true,
      createdAt: "2026-10-07T10:00:00.000Z",
      items: [],
    }),
    ...overrides,
  };
}

describe("lineRefundAmount", () => {
  const item = sale().items[0];

  it("refunds the charged price plus the tax share for the quantity returned", () => {
    // 1 of 3: 100.00 + a third of the 48.00 tax (half-up) = 116.00.
    expect(lineRefundAmount(item, 1)).toBe(11600);
  });

  it("refunds the whole line when every unit goes back", () => {
    expect(lineRefundAmount(item, 3)).toBe(34800);
  });

  it("splits a line discount across the refunded quantity", () => {
    const discounted = { ...item, quantity: 2, discountMinor: 2000, unitPriceMinor: 10000, taxMinor: 2880 };
    // 1 of 2: 100.00 − half the 20.00 discount + half the 28.80 tax = 104.40.
    expect(lineRefundAmount(discounted, 1)).toBe(10440);
  });
});

describe("RefundsService.create", () => {
  it("404s for a sale the tenant does not own", async () => {
    const repo = fakeRepo({ findSaleForRefund: vi.fn().mockResolvedValue(null) });
    const service = new RefundsService(repo);

    await expect(
      service.create(TENANT_ID, SALE_ID, { items: [{ saleItemId: ITEM_ID, quantity: 1 }] }),
    ).rejects.toBeInstanceOf(RefundSaleNotFoundError);
  });

  it("refuses to refund a voided sale", async () => {
    const repo = fakeRepo({ findSaleForRefund: vi.fn().mockResolvedValue(sale({ status: "VOIDED" })) });
    const service = new RefundsService(repo);

    await expect(
      service.create(TENANT_ID, SALE_ID, { items: [{ saleItemId: ITEM_ID, quantity: 1 }] }),
    ).rejects.toMatchObject({ code: "SALE_VOIDED" });
  });

  it("rejects a line that isn't part of the sale", async () => {
    const repo = fakeRepo();
    const service = new RefundsService(repo);

    await expect(
      service.create(TENANT_ID, SALE_ID, {
        items: [{ saleItemId: "99999999-9999-9999-9999-999999999999", quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(RefundValidationError);
  });

  it("refuses to refund more than was sold", async () => {
    const repo = fakeRepo();
    const service = new RefundsService(repo);

    await expect(
      service.create(TENANT_ID, SALE_ID, { items: [{ saleItemId: ITEM_ID, quantity: 4 }] }),
    ).rejects.toMatchObject({ code: "EXCEEDS_REFUNDABLE" });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("counts what is already refunded against the limit", async () => {
    const repo = fakeRepo({
      refundedQuantitiesBySaleItem: vi.fn().mockResolvedValue(new Map([[ITEM_ID, 2]])),
    });
    const service = new RefundsService(repo);

    await expect(
      service.create(TENANT_ID, SALE_ID, { items: [{ saleItemId: ITEM_ID, quantity: 2 }] }),
    ).rejects.toMatchObject({ code: "EXCEEDS_REFUNDABLE" });
  });

  it("sums duplicate lines before checking the limit", async () => {
    const repo = fakeRepo();
    const service = new RefundsService(repo);

    // Two rows of 2 on a 3-unit line must not slip past as two refunds.
    await expect(
      service.create(TENANT_ID, SALE_ID, {
        items: [
          { saleItemId: ITEM_ID, quantity: 2 },
          { saleItemId: ITEM_ID, quantity: 2 },
        ],
      }),
    ).rejects.toMatchObject({ code: "EXCEEDS_REFUNDABLE" });
  });

  it("marks the sale fully refunded once every line is back", async () => {
    const repo = fakeRepo();
    const service = new RefundsService(repo);

    await service.create(TENANT_ID, SALE_ID, { items: [{ saleItemId: ITEM_ID, quantity: 3 }] });

    const args = vi.mocked(repo.create).mock.calls[0][0];
    expect(args.fullyRefunded).toBe(true);
    expect(args.restock).toBe(true); // defaults to putting stock back
    expect(args.lines[0].amountMinor).toBe(34800);
  });

  it("leaves the sale open on a partial refund and can skip the restock", async () => {
    const repo = fakeRepo();
    const service = new RefundsService(repo);

    await service.create(TENANT_ID, SALE_ID, {
      items: [{ saleItemId: ITEM_ID, quantity: 1 }],
      restock: false,
      reason: "wrong flavour",
    });

    const args = vi.mocked(repo.create).mock.calls[0][0];
    expect(args.fullyRefunded).toBe(false);
    expect(args.restock).toBe(false);
    expect(args.reason).toBe("wrong flavour");
  });
});

describe("RefundsService.getRefundable", () => {
  it("reports what is still refundable per line", async () => {
    const repo = fakeRepo({
      refundedQuantitiesBySaleItem: vi.fn().mockResolvedValue(new Map([[ITEM_ID, 1]])),
    });
    const service = new RefundsService(repo);

    const result = await service.getRefundable(TENANT_ID, SALE_ID);

    expect(result.items[0]).toMatchObject({
      soldQuantity: 3,
      refundedQuantity: 1,
      refundableQuantity: 2,
    });
  });
});
