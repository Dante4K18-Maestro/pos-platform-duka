// Audit-log data access — Prisma queries, nothing else.
import type { AuditEntry } from "@pos/contracts";
import { prisma } from "../../db/client";

export interface AuditRepositoryLike {
  list(tenantId: string, limit: number): Promise<AuditEntry[]>;
}

export class AuditRepository implements AuditRepositoryLike {
  async list(tenantId: string, limit: number): Promise<AuditEntry[]> {
    const rows = await prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      actorUserId: row.actorUserId,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
