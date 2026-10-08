import { z } from "zod";

// Payment method as charged. Split tender (many payments per sale) is a
// later slice; the register sends one payment per sale for now.
export const paymentMethodSchema = z.enum(["CASH", "MPESA", "CARD", "STORE_CREDIT", "OTHER"]);

export const paymentInputSchema = z.object({
  method: paymentMethodSchema,
  amountMinor: z.number().int().positive(),
  // Destination phone for an MPESA STK push, e.g. 254712345678. Required for
  // MPESA — enforced by the payments service, not just the type.
  phoneNumber: z
    .string()
    .regex(/^254\d{9}$/, "must be a Kenyan number in 2547XXXXXXXX format")
    .optional(),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;

export const paymentStatusSchema = z.enum(["PENDING", "CONFIRMED", "FAILED"]);

export const paymentRecordSchema = z.object({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  method: paymentMethodSchema,
  amountMinor: z.number().int().positive(),
  status: paymentStatusSchema,
  phoneNumber: z.string().nullable(),
  mpesaReceiptNumber: z.string().nullable(),
  // The CheckoutRequestID the Daraja callback keys on.
  processorReference: z.string().nullable(),
  createdAt: z.string(),
});

export type PaymentRecord = z.infer<typeof paymentRecordSchema>;

// Safaricom's STK callback body. Deliberately loose: Daraja adds fields over
// time, and rejecting a callback for an extra key would mean a lost payment.
export const mpesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string().optional(),
      CheckoutRequestID: z.string().min(1),
      ResultCode: z.number().int(),
      ResultDesc: z.string().optional(),
      CallbackMetadata: z
        .object({
          Item: z.array(
            z.object({
              Name: z.string(),
              Value: z.union([z.string(), z.number()]).optional(),
            }),
          ),
        })
        .optional(),
    }),
  }),
});

export type MpesaCallbackBody = z.infer<typeof mpesaCallbackSchema>;
