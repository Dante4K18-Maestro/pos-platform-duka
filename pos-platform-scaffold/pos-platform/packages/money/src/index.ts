// Currency is integer minor units everywhere — schema, wire format, UI.
// This package owns all arithmetic, tax and rounding so nowhere else does.
//
// Every value in and out of these functions is an integer count of minor
// units (cents). If a currency has a different minor-unit exponent, that is a
// formatting concern handled at the edge, never here.
export function addMinorUnits(a: number, b: number): number {
  return a + b;
}

// Half-up rounding on a basis-point rate (1% = 100 bp). Integer-only: the
// multiplication happens in exact integers before the single divide, and
// Math.round applies half-up so a 0.5 minor unit rounds consistently rather
// than drifting with floating point.
export function applyTax(amountMinor: number, taxRateBasisPoints: number): number {
  return Math.round((amountMinor * taxRateBasisPoints) / 10_000);
}

export interface SaleLineInput {
  unitPriceMinor: number;
  quantity: number;
  discountMinor?: number;
  taxRateBasisPoints?: number;
}

export interface SaleLineTotals {
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
}

export interface SaleTotals extends SaleLineTotals {
  // Per-line breakdown, in input order. Sale items store their own tax so a
  // historical charge survives a later rate change; the aggregate alone
  // cannot reconstruct that.
  lines: SaleLineTotals[];
}

// The one place a sale line's money is decided: discount applies before tax,
// and tax is rounded per line rather than on the aggregate (rounding the sum
// would invent or destroy minor units across a multi-line sale).
export function computeLineTotals(line: SaleLineInput): SaleLineTotals {
  const subtotalMinor = line.unitPriceMinor * line.quantity;
  const discountMinor = line.discountMinor ?? 0;
  const taxMinor = applyTax(subtotalMinor - discountMinor, line.taxRateBasisPoints ?? 0);

  return {
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor: subtotalMinor - discountMinor + taxMinor,
  };
}

export function computeSaleTotals(lines: SaleLineInput[]): SaleTotals {
  const lineTotals = lines.map(computeLineTotals);

  const subtotalMinor = lineTotals.reduce((sum, line) => sum + line.subtotalMinor, 0);
  const discountMinor = lineTotals.reduce((sum, line) => sum + line.discountMinor, 0);
  const taxMinor = lineTotals.reduce((sum, line) => sum + line.taxMinor, 0);

  return {
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor: subtotalMinor - discountMinor + taxMinor,
    lines: lineTotals,
  };
}

export function formatMinorUnits(amountMinor: number, currency = "KES"): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(amountMinor / 100);
}
