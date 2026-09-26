// PUBLIC: Safaricom posts the STK push result here. This route:
//  1. verifies the payload shape (see verify.ts) — it is on the public
//     internet, treat it as hostile input until proven otherwise;
//  2. keys on CheckoutRequestID and is a no-op on a repeat delivery —
//     callbacks can and do arrive more than once;
//  3. is NOT the only place payment state gets set — mpesa-reconcile.ts
//     (a job, run on a sweep) covers the case where this callback never
//     arrives because the Render service was cold or asleep.
export {};
