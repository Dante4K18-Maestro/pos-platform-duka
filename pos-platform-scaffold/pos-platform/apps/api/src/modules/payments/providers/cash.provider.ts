import type { PaymentProvider } from "./provider.interface";

// Cash is always CONFIRMED immediately — no external round trip, no
// reconciliation sweep needed.
export class CashProvider implements PaymentProvider {
  async initiate() {
    return { providerReference: `cash-${Date.now()}`, status: "CONFIRMED" as const };
  }
  async reconcile() {
    return { status: "CONFIRMED" as const };
  }
}
