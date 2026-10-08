// Stores business rules live here, and only here. Beyond tenant scoping the
// one rule that matters: a store can be created with its first till in the
// same step, because a store without a register can't open a cash session.
import type { CreateStoreInput, StoresResponse } from "@pos/contracts";
import { StoresRepository, type StoresRepositoryLike } from "./stores.repository";

export class StoresService {
  constructor(private readonly repo: StoresRepositoryLike = new StoresRepository()) {}

  async list(tenantId: string): Promise<StoresResponse> {
    return this.repo.list(tenantId);
  }

  async create(tenantId: string, input: CreateStoreInput): Promise<{ id: string }> {
    return this.repo.create(tenantId, input.name, input.registerName ?? "Till 1");
  }
}
