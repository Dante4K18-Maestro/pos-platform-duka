// One shape every payment provider implements, so the service layer never
// branches on payment method.
export type PaymentStatus = "PENDING" | "CONFIRMED" | "FAILED";

export interface PaymentProvider {
  initiate(input: { tenantId: string; saleId: string; amount: number; phone?: string }): Promise<{
    providerReference: string;
    status: PaymentStatus;
  }>;
  reconcile(providerReference: string): Promise<{ status: PaymentStatus }>;
}
