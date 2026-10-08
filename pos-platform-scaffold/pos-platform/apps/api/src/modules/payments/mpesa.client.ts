// Daraja (Safaricom M-Pesa) client: OAuth, then an STK push.
//
// Every credential is optional. When any of them is missing the client reports
// itself unconfigured and the payments service records the payment as PENDING
// without inventing a reference — so a demo till never claims money moved.
import { env } from "../../config/env";

const BASES = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
} as const;

export interface StkPushInput {
  phoneNumber: string; // 2547XXXXXXXX
  amountMinor: number; // integer minor units
  accountReference: string;
  description: string;
  // CustomerPayBillOnline for a paybill, CustomerBuyGoodsOnline for a till.
  transactionType?: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
}

export interface StkPushResult {
  checkoutRequestId: string;
  merchantRequestId: string;
  customerMessage: string;
}

export interface StkQueryResult {
  // null means "still processing" — Daraja reports that as an errorCode rather
  // than a ResultCode, and calling it a failure would strand real payments.
  resultCode: number | null;
  resultDesc: string;
}

export class MpesaError extends Error {
  constructor(
    message: string,
    readonly statusCode = 502,
    readonly code = "MPESA_ERROR",
  ) {
    super(message);
  }
}

// Daraja expects a 14-digit timestamp in Nairobi local time (UTC+3, no DST).
export function nairobiTimestamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
}

export class MpesaClient {
  private readonly base = BASES[env.MPESA_ENVIRONMENT];

  static isConfigured(): boolean {
    return Boolean(
      env.MPESA_CONSUMER_KEY &&
        env.MPESA_CONSUMER_SECRET &&
        env.MPESA_PASSKEY &&
        env.MPESA_SHORTCODE &&
        env.MPESA_CALLBACK_URL,
    );
  }

  private async accessToken(): Promise<string> {
    const credentials = Buffer.from(
      `${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`,
    ).toString("base64");

    const res = await fetch(`${this.base}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { authorization: `Basic ${credentials}` },
    });
    const body = (await res.json().catch(() => null)) as { access_token?: string } | null;
    if (!res.ok || !body?.access_token) {
      throw new MpesaError("could not authenticate with Daraja", 502, "MPESA_AUTH_FAILED");
    }
    return body.access_token;
  }

  // Daraja wants whole shillings, at least 1.
  private static toWholeShillings(amountMinor: number): number {
    return Math.max(1, Math.round(amountMinor / 100));
  }

  async stkPush(input: StkPushInput): Promise<StkPushResult> {
    if (!MpesaClient.isConfigured()) {
      throw new MpesaError("M-Pesa is not configured on this server", 503, "MPESA_NOT_CONFIGURED");
    }

    const timestamp = nairobiTimestamp();
    const password = Buffer.from(
      `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`,
    ).toString("base64");
    const token = await this.accessToken();

    const res = await fetch(`${this.base}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: input.transactionType ?? "CustomerPayBillOnline",
        // Daraja takes whole shillings here; the exact minor-unit amount is
        // already stored on the payment row.
        Amount: MpesaClient.toWholeShillings(input.amountMinor),
        PartyA: input.phoneNumber,
        PartyB: env.MPESA_SHORTCODE,
        PhoneNumber: input.phoneNumber,
        CallBackURL: env.MPESA_CALLBACK_URL,
        AccountReference: input.accountReference,
        TransactionDesc: input.description,
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      CheckoutRequestID?: string;
      MerchantRequestID?: string;
      CustomerMessage?: string;
      errorMessage?: string;
    } | null;

    if (!res.ok || !body?.CheckoutRequestID) {
      throw new MpesaError(
        body?.errorMessage ?? "Daraja rejected the STK push",
        502,
        "MPESA_PUSH_FAILED",
      );
    }

    return {
      checkoutRequestId: body.CheckoutRequestID,
      merchantRequestId: body.MerchantRequestID ?? "",
      customerMessage: body.CustomerMessage ?? "",
    };
  }

  // Ask Daraja what happened to an STK push. This is the safety net for a
  // callback that never arrived (a cold Render instance swallowing it is the
  // classic case) — see jobs/mpesa-reconcile.ts.
  async stkPushQuery(checkoutRequestId: string): Promise<StkQueryResult> {
    if (!MpesaClient.isConfigured()) {
      throw new MpesaError("M-Pesa is not configured on this server", 503, "MPESA_NOT_CONFIGURED");
    }

    const timestamp = nairobiTimestamp();
    const password = Buffer.from(
      `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`,
    ).toString("base64");
    const token = await this.accessToken();

    const res = await fetch(`${this.base}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      ResultCode?: string | number;
      ResultDesc?: string;
      errorCode?: string;
      errorMessage?: string;
    } | null;

    if (!res.ok) throw new MpesaError("Daraja rejected the status query", 502, "MPESA_QUERY_FAILED");
    if (body?.errorCode) {
      // "still under processing" arrives here — leave the payment PENDING.
      return { resultCode: null, resultDesc: body.errorMessage ?? "still processing" };
    }

    const code = body?.ResultCode === undefined ? null : Number(body.ResultCode);
    return {
      resultCode: code !== null && Number.isFinite(code) ? code : null,
      resultDesc: body?.ResultDesc ?? "",
    };
  }
}
