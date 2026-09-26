// Business rules live here, and only here — the controller shapes HTTP,
// the repository shapes SQL, this file decides what a sale IS.
import { SalesRepository } from "./sales.repository";

export interface CreateSaleInput {
  clientId: string;
  tenantId: string;
  registerId: string;
  items: Array<{ variantId: string; quantity: number; unitPrice: number }>;
}

export class SalesService {
  private repo = new SalesRepository();

  async createSale(input: CreateSaleInput) {
    const existing = await this.repo.findByClientId(input.clientId);
    if (existing) return existing; // idempotent replay — same rule as sync

    // Tax resolution against tax_rates lands with the payments/tax work;
    // for now the subtotal is real, tax is a placeholder zero rather than a
    // silently wrong number.
    const subtotalMinor = input.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const discountMinor = 0;
    const taxMinor = 0;
    const totalMinor = subtotalMinor - discountMinor + taxMinor;

    return this.repo.create({
      ...input,
      totals: { subtotalMinor, discountMinor, taxMinor, totalMinor },
    });
  }

  async getSale(id: string) {
    return this.repo.findById(id);
  }

  async voidSale(id: string) {
    return this.repo.markVoided(id);
  }
}
