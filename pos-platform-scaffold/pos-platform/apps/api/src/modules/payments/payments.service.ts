// Dispatches to the right provider (cash, mpesa, ...) via the shared
// provider interface. Never assumes the callback is the only source of
// truth — see providers/mpesa/reconcile.ts.
export {};
