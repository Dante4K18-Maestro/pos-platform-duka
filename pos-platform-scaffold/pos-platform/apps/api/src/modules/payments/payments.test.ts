import { describe, expect, it, vi } from "vitest";
import { PaymentsService } from "./payments.service";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const SALE_ID = "22222222-2222-2222-2222-222222222222";

function mockPrisma(sale: { totalMinor: number } | null) {
  return {
    sale: { findFirst: vi.fn().mockResolvedValue(sale) },
    payment: { create: vi.fn().mockResolvedValue({ id: "payment-1" }) },
  };
}

describe("PaymentsService.record", () => {
  it("records CASH as CONFIRMED immediately", async () => {
    const db = mockPrisma({ totalMinor: 10000 });
    const service = new PaymentsService(db as never);

    await service.record(SALE_ID, TENANT_ID, { method: "CASH", amountMinor: 10000 });

    expect(db.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CONFIRMED" }) }),
    );
  });

  it("records MPESA as PENDING until the callback confirms", async () => {
    const db = mockPrisma({ totalMinor: 10000 });
    const service = new PaymentsService(db as never);

    await service.record(SALE_ID, TENANT_ID, {
      method: "MPESA",
      amountMinor: 10000,
      phoneNumber: "254712345678",
    });

    expect(db.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PENDING" }) }),
    );
  });

  it("rejects MPESA without a phone number", async () => {
    const db = mockPrisma({ totalMinor: 10000 });
    const service = new PaymentsService(db as never);

    await expect(service.record(SALE_ID, TENANT_ID, { method: "MPESA", amountMinor: 1000 }))
      .rejects.toMatchObject({ code: "PHONE_REQUIRED", statusCode: 400 });
    expect(db.payment.create).not.toHaveBeenCalled();
  });

  it("rejects a payment above the sale total", async () => {
    const db = mockPrisma({ totalMinor: 1000 });
    const service = new PaymentsService(db as never);

    await expect(service.record(SALE_ID, TENANT_ID, { method: "CASH", amountMinor: 2000 }))
      .rejects.toMatchObject({ code: "AMOUNT_EXCEEDS_TOTAL" });
    expect(db.payment.create).not.toHaveBeenCalled();
  });

  it("rejects a payment for another tenant's sale", async () => {
    const db = mockPrisma(null);
    const service = new PaymentsService(db as never);

    await expect(service.record(SALE_ID, TENANT_ID, { method: "CASH", amountMinor: 500 }))
      .rejects.toMatchObject({ code: "SALE_NOT_FOUND" });
    expect(db.payment.create).not.toHaveBeenCalled();
  });
});
