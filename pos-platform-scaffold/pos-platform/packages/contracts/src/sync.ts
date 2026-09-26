import { z } from "zod";

export const syncPushSchema = z.object({
  clientId: z.string().uuid(),
  table: z.string(),
  payload: z.record(z.unknown()),
});

export type SyncPush = z.infer<typeof syncPushSchema>;
