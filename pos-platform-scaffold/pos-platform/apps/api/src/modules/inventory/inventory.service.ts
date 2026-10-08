// Inventory business rules live here, and only here.
import type { InventoryItem } from "@pos/contracts";
import {
  InventoryRepository,
  type InventoryRepositoryLike,
} from "./inventory.repository";

export class InventoryService {
  constructor(private readonly repo: InventoryRepositoryLike = new InventoryRepository()) {}

  async list(tenantId: string): Promise<InventoryItem[]> {
    return this.repo.list(tenantId);
  }
}
