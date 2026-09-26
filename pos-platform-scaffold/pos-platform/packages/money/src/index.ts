// Currency is integer minor units everywhere — schema, wire format, UI.
// This package owns all arithmetic, tax and rounding so nowhere else does.
export function addMinorUnits(a: number, b: number): number {
  return a + b;
}

export function applyTax(amountMinor: number, taxRateBasisPoints: number): number {
  return Math.round((amountMinor * taxRateBasisPoints) / 10_000);
}

export function formatMinorUnits(amountMinor: number, currency = "KES"): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(amountMinor / 100);
}
