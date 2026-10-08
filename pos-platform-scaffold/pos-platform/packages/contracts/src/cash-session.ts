// Cash sessions: one drawer, one shift. Open with a float, record pay-ins and
// pay-outs as they happen, close by counting what's actually in the drawer.
// The variance is computed server-side and stored, never recomputed later.
import { z } from "zod";

export const cashMovementSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["PAY_IN", "PAY_OUT"]),
  amountMinor: z.number().int().positive(),
  reason: z.string().nullable(),
  createdAt: z.string(),
});

export type CashMovement = z.infer<typeof cashMovementSchema>;

export const cashSessionSchema = z.object({
  id: z.string().uuid(),
  registerId: z.string().uuid(),
  registerName: z.string(),
  openedByUserId: z.string().uuid(),
  openingFloatMinor: z.number().int().nonnegative(),
  countedCloseMinor: z.number().int().nonnegative().nullable(),
  computedVarianceMinor: z.number().int().nullable(),
  closedAt: z.string().nullable(),
  createdAt: z.string(),
  // Derived from the session's confirmed cash sales and its movements.
  cashSalesMinor: z.number().int(),
  payInMinor: z.number().int().nonnegative(),
  payOutMinor: z.number().int().nonnegative(),
  // openingFloat + cashSales + payIns − payOuts — what the drawer *should*
  // hold right now, or held at close.
  expectedCashMinor: z.number().int(),
  movements: z.array(cashMovementSchema),
});

export type CashSession = z.infer<typeof cashSessionSchema>;

export const cashSessionsResponseSchema = z.object({
  sessions: z.array(cashSessionSchema),
  // The drawer currently open, if any — the page renders this at the top.
  open: cashSessionSchema.nullable(),
});

export const openCashSessionSchema = z.object({
  registerId: z.string().uuid(),
  openingFloatMinor: z.number().int().min(0),
});

export const closeCashSessionSchema = z.object({
  countedCloseMinor: z.number().int().min(0),
});

// A reason is required for PAY_OUT (money leaving needs a story) and
// optional for PAY_IN.
export const createCashMovementSchema = z.object({
  type: z.enum(["PAY_IN", "PAY_OUT"]),
  amountMinor: z.number().int().positive(),
  reason: z.string().trim().max(200).optional(),
});

export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>;
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>;
export type CreateCashMovementInput = z.infer<typeof createCashMovementSchema>;
