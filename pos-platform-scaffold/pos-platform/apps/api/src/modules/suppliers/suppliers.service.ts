// Suppliers business rules live here, and only here.
import type { CreateSupplierInput, SupplierListItem } from "@pos/contracts";
import { SuppliersRepository, type SuppliersRepositoryLike } from "./suppliers.repository";

export class SuppliersService {
  constructor(private readonly repo: SuppliersRepositoryLike = new SuppliersRepository()) {}

  async list(tenantId: string): Promise<SupplierListItem[]> {
    return this.repo.list(tenantId);
  }

  async create(tenantId: string, input: CreateSupplierInput): Promise<{ id: string }> {
    // Only the fields the form collects are serialised into the contactInfo
    // blob, so it always reads back as { email?, phone? } — the shape both
    // the register tab and the back-office page expect.
    const contactInfo: { email?: string; phone?: string } = {};
    if (input.email) contactInfo.email = input.email;
    if (input.phone) contactInfo.phone = input.phone;
    return this.repo.create(tenantId, input.name, contactInfo);
  }
}
