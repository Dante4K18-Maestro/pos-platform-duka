// Purchase order business rules live here, and only here.
import type { CreatePurchaseOrderInput, PurchaseOrderListItem } from "@pos/contracts";
import {
  PurchaseOrdersRepository,
  type PurchaseOrdersRepositoryLike,
} from "./purchase-orders.repository";

export class PurchaseOrderValidationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }

  readonly statusCode = 400;
}

export class PurchaseOrdersService {
  constructor(
    private readonly repo: PurchaseOrdersRepositoryLike = new PurchaseOrdersRepository(),
  ) {}

  async list(tenantId: string): Promise<PurchaseOrderListItem[]> {
    return this.repo.list(tenantId);
  }

  async create(tenantId: string, input: CreatePurchaseOrderInput): Promise<{ id: string }> {
    // Supplier and store must belong to the calling tenant — a draft order
    // can never reference another shop's rows, even with a valid uuid.
    const [supplier, store] = await Promise.all([
      this.repo.findSupplier(tenantId, input.supplierId),
      this.repo.findStore(tenantId, input.storeId),
    ]);
    if (!supplier) {
      throw new PurchaseOrderValidationError("supplier not found", "SUPPLIER_NOT_FOUND");
    }
    if (!store) {
      throw new PurchaseOrderValidationError("store not found", "STORE_NOT_FOUND");
    }
    return this.repo.create(tenantId, input);
  }
}
