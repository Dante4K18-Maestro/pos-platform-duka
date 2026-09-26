// Sweeps payments still PENDING, queries Daraja via
// modules/payments/providers/mpesa/reconcile.ts. Run on an interval (e.g.
// every 30s) — this is what makes a missed Safaricom callback recoverable
// instead of catastrophic.
export {};
