// In-process scheduler.
//
// Two jobs, both small enough to live inside the API rather than a separate
// worker or an external cron:
//
//   1. M-Pesa recheck — every minute, sweep payments still PENDING and ask
//      Daraja what actually happened. This is the safety net for a callback
//      Safaricom never managed to deliver (a cold free-tier instance is the
//      classic case).
//   2. Keep-awake ping — during trading hours, hit this deployment's own
//      /health on a slow interval so a free-tier service does not spin down
//      mid-trading-day and start swallowing callbacks in the first place.
//
// Both are wrapped so a failure logs and the loop continues; nothing here is
// allowed to take the API down.
import { env } from "../config/env";
import { logger } from "../config/logger";
import { MpesaClient } from "../modules/payments/mpesa.client";
import { PaymentsService } from "../modules/payments/payments.service";

const RECONCILE_INTERVAL_MS = 60_000;
const WARM_INTERVAL_MS = 10 * 60_000;

export interface SchedulerStatus {
  enabled: boolean;
  mpesaConfigured: boolean;
  reconcileIntervalMs: number;
  warmIntervalMs: number;
  tradingHours: { start: number; end: number; timezone: string };
  lastReconcile: { at: string; summary: Record<string, number> } | null;
  lastWarmPing: { at: string; ok: boolean; target: string } | null;
}

const status: SchedulerStatus = {
  enabled: false,
  mpesaConfigured: MpesaClient.isConfigured(),
  reconcileIntervalMs: RECONCILE_INTERVAL_MS,
  warmIntervalMs: WARM_INTERVAL_MS,
  tradingHours: {
    start: env.TRADING_HOURS_START,
    end: env.TRADING_HOURS_END,
    timezone: env.TRADING_TIMEZONE,
  },
  lastReconcile: null,
  lastWarmPing: null,
};

export function schedulerStatus(): SchedulerStatus {
  return { ...status, mpesaConfigured: MpesaClient.isConfigured() };
}

// Current hour (0-23) in the configured trading timezone. Kenya has no DST,
// but going through Intl means a deployment in another zone still lines up
// with the shop's clock rather than the server's.
function currentHour(timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === "hour")?.value ?? "0";
  return Number.parseInt(hour, 10) % 24;
}

export function isTradingHours(): boolean {
  const hour = currentHour(env.TRADING_TIMEZONE);
  const { start, end } = status.tradingHours;
  // Supports a window that wraps past midnight (e.g. 22 → 6).
  return start <= end ? hour >= start && hour < end : hour >= start || hour < end;
}

async function runReconcile(): Promise<void> {
  if (!MpesaClient.isConfigured()) return;
  try {
    const summary = await new PaymentsService().reconcilePending();
    status.lastReconcile = { at: new Date().toISOString(), summary };
    if (summary.checked > 0) logger.info(summary, "scheduler: mpesa recheck complete");
  } catch (err) {
    logger.warn({ err }, "scheduler: mpesa recheck failed (will retry)");
  }
}

async function runWarmPing(): Promise<void> {
  const target = env.PUBLIC_BASE_URL;
  if (!target) return;
  if (!isTradingHours()) return;
  const url = `${target.replace(/\/+$/, "")}/health`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    status.lastWarmPing = { at: new Date().toISOString(), ok: res.ok, target: url };
    if (!res.ok) logger.warn({ status: res.status }, "scheduler: keep-awake ping non-200");
  } catch (err) {
    status.lastWarmPing = { at: new Date().toISOString(), ok: false, target: url };
    logger.warn({ err }, "scheduler: keep-awake ping failed (will retry)");
  }
}

export function startScheduler(): () => void {
  if (!env.SCHEDULER_ENABLED) {
    logger.info("scheduler: disabled via SCHEDULER_ENABLED");
    return () => {};
  }

  status.enabled = true;
  logger.info(
    {
      mpesaConfigured: MpesaClient.isConfigured(),
      publicBaseUrl: env.PUBLIC_BASE_URL ?? "(unset — keep-awake disabled)",
      tradingHours: `${env.TRADING_HOURS_START}-${env.TRADING_HOURS_END} ${env.TRADING_TIMEZONE}`,
    },
    "scheduler: started",
  );

  let reconcileBusy = false;
  let warmBusy = false;

  const reconcileTimer = setInterval(() => {
    if (reconcileBusy) return;
    reconcileBusy = true;
    void runReconcile().finally(() => {
      reconcileBusy = false;
    });
  }, RECONCILE_INTERVAL_MS);

  const warmTimer = setInterval(() => {
    if (warmBusy) return;
    warmBusy = true;
    void runWarmPing().finally(() => {
      warmBusy = false;
    });
  }, WARM_INTERVAL_MS);

  // Kick a first sweep shortly after boot (a callback may have been missed
  // while this instance was asleep), without blocking the listen().
  const kickoff = setTimeout(() => void runReconcile(), 5_000);

  return () => {
    clearInterval(reconcileTimer);
    clearInterval(warmTimer);
    clearTimeout(kickoff);
    status.enabled = false;
    logger.info("scheduler: stopped");
  };
}
