import { z } from "zod";

// The audit trail, newest first. Money and refunds both write here, so this
// is the screen a merchant reaches for when two people disagree about what
// happened.
export const auditEntrySchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  actorUserId: z.string().nullable(),
  createdAt: z.string(),
});

export const auditResponseSchema = z.object({
  entries: z.array(auditEntrySchema),
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type AuditResponse = z.infer<typeof auditResponseSchema>;
