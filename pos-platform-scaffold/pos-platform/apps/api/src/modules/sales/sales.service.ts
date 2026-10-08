// Business rules live here, and only here — the controller shapes HTTP,
// the repository shapes SQL, this file decides what a sale IS.
import type { CreateSaleInput as CreateSalePayload, PaymentInput } from "@pos/contracts";
import { computeSaleTotals } from "@pos/money";
import { PaymentsService } from "../payments/payments.service";
import { SalesRepository, type SalesRepositoryLike } from "./sales.repository";

// tenantId is attached from the verified session, never from the body — so it
// is added to the contract's wire shape rather than being part of it.
export type CreateSaleInput = CreateSalePayload & {
  tenantId: string;
  payment?: PaymentInput;
  // The drawer this sale belongs to, resolved from the register's open cash
  // session. Null when nobody has opened the till — the sale still stands.
  cashSessionId?: string | null;
};

export class SalesService {
  constructor(
    private readonly repo: SalesRepositoryLike = new SalesRepository(),
    private readonly payments = new PaymentsService(),
  ) {}

  async createSale(input: CreateSaleInput) {
    // Idempotent replay: the client_id is generated once, offline, and a
    // retried sync push must return the original sale rather than sell the
    // same basket twice.
    const existing = await this.repo.findByClientId(input.clientId);
    if (existing) return existing;

    // Tax is resolved server-side, not taken from the request. Until variants
    // carry their own tax-rate link, the tenant rate applies to every line.
    const taxRateBasisPoints = await this.repo.resolveTaxRateBasisPoints(input.tenantId);

    const totals = computeSaleTotals(
      input.items.map((item) => ({
        unitPriceMinor: item.unitPrice,
        quantity: item.quantity,
        discountMinor: item.discountMinor,
        taxRateBasisPoints,
      })),
    );

    // Attach the sale to whatever drawer is open on this register, so the
    // cash-up at close counts exactly the sales rung through this shift.
    const cashSessionId = await this.repo.findOpenCashSessionId(input.tenantId, input.registerId);

    const sale = await this.repo.create({ ...input, totals, cashSessionId });

    // The register charges in one gesture; recording the payment here keeps
    // "no sale without its payment" true at the service level. A payment that
    // fails validation leaves the sale behind rather than half-completing it.
    if (input.payment) {
      await this.payments.record(sale.id, input.tenantId, input.payment);
    }

    return this.repo.findById(sale.id, input.tenantId);
  }

  async getSale(id: string, tenantId: string) {
    return this.repo.findById(id, tenantId);
  }

  async voidSale(id: string, tenantId: string) {
    return this.repo.markVoided(id, tenantId);
  }
}
