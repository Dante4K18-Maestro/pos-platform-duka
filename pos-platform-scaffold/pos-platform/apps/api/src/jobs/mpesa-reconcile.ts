// Sweeps payments still PENDING and asks Daraja what actually happened.
//
// This is the mitigation for the one failure mode a callback cannot cover:
// Safaricom posted, and this process was asleep (Render free tier spins down
// after 15 minutes idle). Run on an interval — render.yaml wires it to a cron
// every minute. Exits 0 when M-Pesa is not configured, so a deployment
// without Daraja credentials does not show a failing cron.
import { logger } from "../config/logger";
import { prisma } from "../db/client";
import { MpesaClient } from "../modules/payments/mpesa.client";
import { PaymentsService } from "../modules/payments/payments.service";

async function main() {
  if (!MpesaClient.isConfigured()) {
    logger.info("mpesa-reconcile: Daraja is not configured, nothing to sweep");
    return;
  }

  const summary = await new PaymentsService().reconcilePending();
  logger.info(summary, "mpesa-reconcile: sweep complete");

  if (summary.failed > 0) {
    logger.warn({ failed: summary.failed }, "mpesa-reconcile: payments marked failed");
  }
}

main()
  .catch((err) => {
    logger.error({ err }, "mpesa-reconcile: sweep crashed");
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
