import { describe, expect, it, vi } from "vitest";
import type { CashSessionRow, CashSessionsRepositoryLike } from "./cash-sessions.repository";
import {
  CashMovementReasonError,
  CashSessionClosedError,
  CashSessionConflictError,
  CashSessionNotFoundError,
  CashSessionsService,
  RegisterNotFoundError,
} from "./cash-sessions.service";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const REGISTER_ID = "33333333-3333-3333-3333-333333333333";
const SESSION_ID = "44444444-4444-4444-4444-444444444444";

function session(overrides: Partial<CashSessionRow> = {}): CashSessionRow {
  return {
    id: SESSION_ID,
    registerId: REGISTER_ID,
    registerName: "Till 1",
    openedByUserId: "user-1",
    openingFloatMinor: 200000,
    countedCloseMinor: null,
    computedVarianceMinor: null,
    closedAt: null,
    createdAt: "2026-10-07T08:00:00.000Z",
    cashSalesMinor: 9280,
    payInMinor: 10000,
    payOutMinor: 5000,
    expectedCashMinor: 214280, // 200000 + 9280 + 10000 - 5000
    movements: [],
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<CashSessionsRepositoryLike> = {}): CashSessionsRepositoryLike {
  return {
    list: vi.fn().mockResolvedValue([]),
    findOpen: vi.fn().mockResolvedValue(null),
    findOpenByRegister: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(session()),
    registerExists: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockResolvedValue(session()),
    close: vi.fn().mockResolvedValue(session()),
    addMovement: vi.fn().mockResolvedValue({
      id: "movement-1",
      type: "PAY_IN",
      amountMinor: 1000,
      reason: null,
      createdAt: "2026-10-07T08:05:00.000Z",
    }),
    ...overrides,
  };
}

describe("CashSessionsService.open", () => {
  it("opens a drawer on a register that has none open", async () => {
    const repo = fakeRepo();
    const service = new CashSessionsService(repo);

    await service.open(TENANT_ID, "user-1", { registerId: REGISTER_ID, openingFloatMinor: 200000 });

    expect(repo.create).toHaveBeenCalledWith(TENANT_ID, {
      registerId: REGISTER_ID,
      openedByUserId: "user-1",
      openingFloatMinor: 200000,
    });
  });

  it("refuses a second drawer on the same register", async () => {
    const repo = fakeRepo({ findOpenByRegister: vi.fn().mockResolvedValue({ id: "existing" }) });
    const service = new CashSessionsService(repo);

    await expect(
      service.open(TENANT_ID, "user-1", { registerId: REGISTER_ID, openingFloatMinor: 0 }),
    ).rejects.toBeInstanceOf(CashSessionConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("refuses a register this tenant does not own", async () => {
    const repo = fakeRepo({ registerExists: vi.fn().mockResolvedValue(false) });
    const service = new CashSessionsService(repo);

    await expect(
      service.open(TENANT_ID, "user-1", { registerId: REGISTER_ID, openingFloatMinor: 0 }),
    ).rejects.toBeInstanceOf(RegisterNotFoundError);
  });
});

describe("CashSessionsService.close", () => {
  it("records the variance as counted minus expected", async () => {
    const repo = fakeRepo();
    const service = new CashSessionsService(repo);

    // The drawer should hold 2,142.80 and the cashier counted 2,092.80.
    await service.close(TENANT_ID, SESSION_ID, { countedCloseMinor: 209280 });

    expect(repo.close).toHaveBeenCalledWith(SESSION_ID, 209280, -5000);
  });

  it("records a zero variance when the count matches exactly", async () => {
    const repo = fakeRepo();
    const service = new CashSessionsService(repo);

    await service.close(TENANT_ID, SESSION_ID, { countedCloseMinor: 214280 });

    expect(repo.close).toHaveBeenCalledWith(SESSION_ID, 214280, 0);
  });

  it("will not close a drawer that is already closed", async () => {
    const repo = fakeRepo({
      findById: vi.fn().mockResolvedValue(session({ closedAt: "2026-10-07T18:00:00.000Z" })),
    });
    const service = new CashSessionsService(repo);

    await expect(
      service.close(TENANT_ID, SESSION_ID, { countedCloseMinor: 1000 }),
    ).rejects.toBeInstanceOf(CashSessionClosedError);
    expect(repo.close).not.toHaveBeenCalled();
  });

  it("404s for a session the tenant does not own", async () => {
    const repo = fakeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = new CashSessionsService(repo);

    await expect(
      service.close(TENANT_ID, SESSION_ID, { countedCloseMinor: 1000 }),
    ).rejects.toBeInstanceOf(CashSessionNotFoundError);
  });
});

describe("CashSessionsService.addMovement", () => {
  it("requires a reason for a pay-out", async () => {
    const repo = fakeRepo();
    const service = new CashSessionsService(repo);

    await expect(
      service.addMovement(TENANT_ID, SESSION_ID, { type: "PAY_OUT", amountMinor: 500 }),
    ).rejects.toBeInstanceOf(CashMovementReasonError);
    expect(repo.addMovement).not.toHaveBeenCalled();
  });

  it("accepts a pay-out with a reason", async () => {
    const repo = fakeRepo();
    const service = new CashSessionsService(repo);

    await service.addMovement(TENANT_ID, SESSION_ID, {
      type: "PAY_OUT",
      amountMinor: 500,
      reason: "airtime float",
    });

    expect(repo.addMovement).toHaveBeenCalledOnce();
  });

  it("does not require a reason for a pay-in", async () => {
    const repo = fakeRepo();
    const service = new CashSessionsService(repo);

    await service.addMovement(TENANT_ID, SESSION_ID, { type: "PAY_IN", amountMinor: 500 });

    expect(repo.addMovement).toHaveBeenCalledOnce();
  });

  it("refuses a movement on a closed drawer", async () => {
    const repo = fakeRepo({
      findById: vi.fn().mockResolvedValue(session({ closedAt: "2026-10-07T18:00:00.000Z" })),
    });
    const service = new CashSessionsService(repo);

    await expect(
      service.addMovement(TENANT_ID, SESSION_ID, { type: "PAY_IN", amountMinor: 500 }),
    ).rejects.toBeInstanceOf(CashSessionClosedError);
  });
});
