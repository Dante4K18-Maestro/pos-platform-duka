import { describe, expect, it, vi } from "vitest";
import type { SaleRecord, SalesRepositoryLike } from "./sales.repository";
import { SalesService, type CreateSaleInput } from "./sales.service";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_ID = "22222222-2222-2222-2222-222222222222";
const REGISTER_ID = "33333333-3333-3333-3333-333333333333";
const VARIANT_ID = "44444444-4444-4444-4444-444444444444";

function saleRecord(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "sale-1",
    tenantId: TENANT_ID,
    clientId: CLIENT_ID,
    registerId: REGISTER_ID,
    status: "COMPLETED",
    subtotalMinor: 16000,
    discountMinor: 0,
    taxMinor: 2560,
    totalMinor: 18560,
    ...overrides,
  };
}

// The service builds a real PaymentsService against prisma unless one is
// injected; sale tests never exercise the payment path.
function fakePayments() {
  return { record: vi.fn().mockResolvedValue({ id: "payment-1" }) } as never;
}

function fakeRepo(overrides: Partial<SalesRepositoryLike> = {}): SalesRepositoryLike {
  return {
    findByClientId: vi.fn().mockResolvedValue(null),
    resolveTaxRateBasisPoints: vi.fn().mockResolvedValue(1600),
    findOpenCashSessionId: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(saleRecord()),
    findById: vi.fn().mockResolvedValue(null),
    markVoided: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function input(): CreateSaleInput {
  return {
    tenantId: TENANT_ID,
    clientId: CLIENT_ID,
    registerId: REGISTER_ID,
    items: [{ variantId: VARIANT_ID, quantity: 2, unitPrice: 8000 }],
  };
}

describe("SalesService.createSale", () => {
  it("replays a known clientId instead of creating a second sale", async () => {
    const existing = saleRecord({ id: "sale-original" });
    const repo = fakeRepo({ findByClientId: vi.fn().mockResolvedValue(existing) });
    const service = new SalesService(repo, fakePayments());

    const sale = await service.createSale(input());

    expect(sale).toBe(existing);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("resolves tax server-side and persists per-line tax", async () => {
    const repo = fakeRepo();
    const service = new SalesService(repo, fakePayments());

    await service.createSale(input());

    expect(repo.resolveTaxRateBasisPoints).toHaveBeenCalledWith(TENANT_ID);
    expect(repo.create).toHaveBeenCalledOnce();

    const arg = vi.mocked(repo.create).mock.calls[0][0];
    expect(arg.totals).toMatchObject({
      subtotalMinor: 16000,
      discountMinor: 0,
      taxMinor: 2560, // 16% of 16000
      totalMinor: 18560,
    });
    expect(arg.totals.lines[0].taxMinor).toBe(2560);
  });

  it("treats a tenant with no tax rate as 0%, not a guess", async () => {
    const repo = fakeRepo({ resolveTaxRateBasisPoints: vi.fn().mockResolvedValue(0) });
    const service = new SalesService(repo, fakePayments());

    await service.createSale(input());

    const arg = vi.mocked(repo.create).mock.calls[0][0];
    expect(arg.totals.taxMinor).toBe(0);
    expect(arg.totals.totalMinor).toBe(16000);
  });

  it("attaches the sale to the register's open drawer", async () => {
    const repo = fakeRepo({ findOpenCashSessionId: vi.fn().mockResolvedValue("session-1") });
    const service = new SalesService(repo, fakePayments());

    await service.createSale(input());

    expect(repo.findOpenCashSessionId).toHaveBeenCalledWith(TENANT_ID, REGISTER_ID);
    const arg = vi.mocked(repo.create).mock.calls[0][0];
    expect(arg.cashSessionId).toBe("session-1");
  });
});

describe("SalesService reads", () => {
  it("scopes a lookup by tenant", async () => {
    const repo = fakeRepo();
    const service = new SalesService(repo, fakePayments());

    await service.getSale("sale-1", TENANT_ID);

    expect(repo.findById).toHaveBeenCalledWith("sale-1", TENANT_ID);
  });

  it("returns null from voidSale when the tenant does not own the sale", async () => {
    const repo = fakeRepo({ markVoided: vi.fn().mockResolvedValue(null) });
    const service = new SalesService(repo, fakePayments());

    expect(await service.voidSale("sale-1", TENANT_ID)).toBeNull();
    expect(repo.markVoided).toHaveBeenCalledWith("sale-1", TENANT_ID);
  });
});
