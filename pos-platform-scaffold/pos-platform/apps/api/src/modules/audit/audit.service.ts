// Audit business rules live here, and only here. The only rule so far is the
// page size — the trail is unbounded, the screen is not.
import type { AuditEntry } from "@pos/contracts";
import { AuditRepository, type AuditRepositoryLike } from "./audit.repository";

const DEFAULT_LIMIT = 100;

export class AuditService {
  constructor(private readonly repo: AuditRepositoryLike = new AuditRepository()) {}

  async list(tenantId: string, limit = DEFAULT_LIMIT): Promise<AuditEntry[]> {
    return this.repo.list(tenantId, Math.min(Math.max(limit, 1), 500));
  }
}
