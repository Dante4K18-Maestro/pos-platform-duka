// Customers business rules live here, and only here.
import type { CreateCustomerInput, CustomerSummary } from "@pos/contracts";
import {
  CustomersRepository,
  type CustomersRepositoryLike,
} from "./customers.repository";

// Surface the duplicate-phone attempt as a 409 so the UI can say "already
// exists" instead of a generic 500.
export class CustomerConflictError extends Error {
  readonly statusCode = 409;
  readonly code = "CUSTOMER_PHONE_EXISTS";
  constructor(phone: string) {
    super(`a customer with phone ${phone} already exists`);
  }
}

export class CustomersService {
  constructor(private readonly repo: CustomersRepositoryLike = new CustomersRepository()) {}

  async list(tenantId: string): Promise<CustomerSummary[]> {
    return this.repo.list(tenantId);
  }

  async create(tenantId: string, input: CreateCustomerInput): Promise<{ id: string }> {
    if (input.phone) {
      const existing = await this.repo.findByPhone(tenantId, input.phone);
      if (existing) throw new CustomerConflictError(input.phone);
    }
    return this.repo.create(tenantId, input);
  }
}
