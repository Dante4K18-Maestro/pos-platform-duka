// Payment rules live here. CASH is money in hand — confirmed the moment it is
// recorded. MPESA is only ever CONFIRMED by Daraja: the STK push earns a
// CheckoutRequestID, and the callback (or the dev simulator) settles it.
import type { MpesaCallbackBody, PaymentInput } from "@pos/contracts";
import { prisma as defaultPrisma } from "../../db/client";
import { MpesaClient } from "./mpesa.client";
import type { PaymentRow, PaymentsPrismaLike } from "./payments.repository";

export class PaymentValidationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }

  readonly statusCode = 400;
}

export type { PaymentsPrismaLike };

export interface CallbackOutcome {
  matched: boolean;
  status?: "CONFIRMED" | "FAILED";
  alreadySettled?: boolean;
}

// CallbackMetadata arrives as a name/value list; without a receipt number the
// payment still confirmed, it just has no reference for the cash-up sheet.
function readMetadataValue(body: MpesaCallbackBody, name: string): string | null {
  const item = body.Body.stkCallback.CallbackMetadata?.Item.find((entry) => entry.Name === name);
  if (!item || item.Value === undefined) return null;
  return String(item.Value);
}

export class PaymentsService {
  constructor(
    private readonly db: PaymentsPrismaLike = defaultPrisma as unknown as PaymentsPrismaLike,
    private readonly mpesa = new MpesaClient(),
  ) {}

  static finalStatusFor(method: PaymentInput["method"]): "CONFIRMED" | "PENDING" {
    return method === "CASH" ? "CONFIRMED" : "PENDING";
  }

  async record(saleId: string, tenantId: string, input: PaymentInput) {
    if (input.method === "MPESA" && !input.phoneNumber) {
      throw new PaymentValidationError(
        "phoneNumber is required for MPESA payments",
        "PHONE_REQUIRED",
      );
    }

    const sale = await this.db.sale.findFirst({ where: { id: saleId, tenantId } });
    if (!sale) {
      throw new PaymentValidationError("sale not found", "SALE_NOT_FOUND");
    }

    if (input.amountMinor > sale.totalMinor) {
      throw new PaymentValidationError(
        "payment exceeds the sale total",
        "AMOUNT_EXCEEDS_TOTAL",
      );
    }

    // Record first, then push. A push that fails still leaves an auditable
    // payment row (FAILED) rather than a sale with no payment attempt at all.
    const payment = await this.db.payment.create({
      data: {
        tenantId,
        saleId,
        method: input.method,
        amountMinor: input.amountMinor,
        status: PaymentsService.finalStatusFor(input.method),
        phoneNumber: input.phoneNumber ?? null,
      },
    });

    if (input.method !== "MPESA") return payment;

    // Without credentials there is no CheckoutRequestID to wait for and no
    // callback coming: the payment stays PENDING and /settings/mpesa says so.
    if (!MpesaClient.isConfigured()) return payment;

    try {
      const push = await this.mpesa.stkPush({
        phoneNumber: input.phoneNumber as string,
        amountMinor: input.amountMinor,
        accountReference: saleId.slice(0, 8).toUpperCase(),
        description: "Duka POS sale",
      });
      return await this.db.payment.update({
        where: { id: payment.id },
        data: { processorReference: push.checkoutRequestId },
      });
    } catch {
      // The customer never got a prompt — say FAILED so the till can retry
      // instead of waiting on a callback that will never arrive.
      return this.db.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
    }
  }

  // Safaricom retries a callback until it gets a 200. Matching on the
  // CheckoutRequestID and short-circuiting a settled row makes a repeat
  // delivery a no-op instead of a second confirmation.
  async handleCallback(body: MpesaCallbackBody): Promise<CallbackOutcome> {
    const callback = body.Body.stkCallback;
    const payment = await this.db.payment.findFirst({
      where: { processorReference: callback.CheckoutRequestID },
    });
    if (!payment) return { matched: false };
    if (payment.status !== "PENDING") return { matched: true, alreadySettled: true };

    const succeeded = callback.ResultCode === 0;
    await this.db.payment.update({
      where: { id: payment.id },
      data: {
        status: succeeded ? "CONFIRMED" : "FAILED",
        mpesaReceiptNumber: succeeded ? readMetadataValue(body, "MpesaReceiptNumber") : null,
      },
    });

    return { matched: true, status: succeeded ? "CONFIRMED" : "FAILED" };
  }

  // The safety net. A callback that never arrived (cold Render instance,
  // network blip) would otherwise leave a customer paid and the till
  // PENDING forever. Each pending push is asked about directly.
  async reconcilePending(limit = 25): Promise<{
    checked: number;
    confirmed: number;
    failed: number;
    stillPending: number;
  }> {
    const result = { checked: 0, confirmed: 0, failed: 0, stillPending: 0 };
    if (!MpesaClient.isConfigured()) return result;

    const pending = await this.db.payment.findMany({
      where: {
        method: "MPESA",
        status: "PENDING",
        processorReference: { not: null },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    for (const payment of pending) {
      if (!payment.processorReference) continue;
      result.checked += 1;
      try {
        const query = await this.mpesa.stkPushQuery(payment.processorReference);
        if (query.resultCode === null) {
          result.stillPending += 1;
        } else if (query.resultCode === 0) {
          await this.db.payment.update({
            where: { id: payment.id },
            // The query does not carry the M-Pesa receipt number; only the
            // callback does. Confirming without one beats not confirming.
            data: { status: "CONFIRMED" },
          });
          result.confirmed += 1;
        } else {
          await this.db.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED" },
          });
          result.failed += 1;
        }
      } catch {
        // Daraja unreachable or rate-limited: leave it PENDING for the next
        // sweep rather than guessing.
        result.stillPending += 1;
      }
    }

    return result;
  }

  // Dev/demo escape hatch: Daraja cannot reach a laptop, so this settles a
  // PENDING M-Pesa payment by hand. The route that exposes it is disabled in
  // production, and it never confirms anything that isn't PENDING MPESA.
  async simulateConfirmation(tenantId: string, paymentId: string): Promise<PaymentRow> {
    const payment = await this.db.payment.findFirst({ where: { id: paymentId, tenantId } });
    if (!payment) throw new PaymentValidationError("payment not found", "PAYMENT_NOT_FOUND");
    if (payment.method !== "MPESA") {
      throw new PaymentValidationError("only MPESA payments need confirming", "NOT_MPESA");
    }
    if (payment.status === "CONFIRMED") return payment;

    return this.db.payment.update({
      where: { id: paymentId },
      data: {
        status: "CONFIRMED",
        mpesaReceiptNumber: `SIM${Date.now().toString(36).toUpperCase()}`,
      },
    });
  }
}
