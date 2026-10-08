// Prisma singleton — one client per process, reused across requests.
import { Prisma, PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

// Interactive transactions against a pooled serverless Postgres (Neon) can be
// closed out from under us mid-flight. Prisma reports P2028 ("Transaction not
// found … or was obtained before disconnecting") or P2034 (write conflict).
// Both are transient — a fresh transaction almost always succeeds — and the
// alternative is a refund or a staff record that silently didn't happen.
const TRANSIENT_TRANSACTION_CODES = new Set(["P2028", "P2034"]);

function isTransientTransactionError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code !== undefined && TRANSIENT_TRANSACTION_CODES.has(code);
}

export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await prisma.$transaction(fn, { maxWait: 10_000, timeout: 20_000 });
    } catch (error) {
      lastError = error;
      if (!isTransientTransactionError(error) || attempt === attempts) throw error;
      // Small backoff so a batch of failing calls doesn't retry in lockstep.
      await new Promise((resolve) => setTimeout(resolve, 120 * attempt));
    }
  }

  throw lastError;
}
