// Payments data access shape. The service depends on this narrow slice rather
// than on Prisma, so its rules are unit-testable with a plain object double.
export interface PaymentRow {
  id: string;
  saleId: string;
  method: string;
  amountMinor: number;
  status: string;
  phoneNumber: string | null;
  mpesaReceiptNumber: string | null;
  processorReference: string | null;
  createdAt: Date;
}

export interface PaymentsPrismaLike {
  sale: {
    findFirst(query: unknown): Promise<{ id: string; totalMinor: number } | null>;
  };
  payment: {
    create(query: unknown): Promise<PaymentRow>;
    // Used by the Daraja callback and the dev simulator.
    findFirst(query: unknown): Promise<PaymentRow | null>;
    update(query: unknown): Promise<PaymentRow>;
    // Used by the reconcile sweep for payments stuck PENDING.
    findMany(query: unknown): Promise<PaymentRow[]>;
  };
}
