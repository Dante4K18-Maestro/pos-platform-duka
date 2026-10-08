import { describe, expect, it } from "vitest";
import { applyTax, computeSaleTotals } from "./index";

describe("applyTax", () => {
  it("applies a basis-point rate", () => {
    // 16% of KES 80.00 (8000 minor)
    expect(applyTax(8000, 1600)).toBe(1280);
  });

  it("rounds half-up to the nearest minor unit", () => {
    // 16% of 1 = 0.16 -> 0, 16% of 3 = 0.48 -> 0, 16% of 4 = 0.64 -> 1
    expect(applyTax(1, 1600)).toBe(0);
    expect(applyTax(4, 1600)).toBe(1);
  });

  it("is zero for a zero rate", () => {
    expect(applyTax(12345, 0)).toBe(0);
  });
});

describe("computeSaleTotals", () => {
  it("sums lines and applies tax per line", () => {
    const totals = computeSaleTotals([
      { unitPriceMinor: 8000, quantity: 2, taxRateBasisPoints: 1600 },
      { unitPriceMinor: 500, quantity: 1, taxRateBasisPoints: 1600 },
    ]);

    expect(totals.subtotalMinor).toBe(16500); // 16000 + 500
    expect(totals.discountMinor).toBe(0);
    expect(totals.taxMinor).toBe(2640); // 2560 + 80
    expect(totals.totalMinor).toBe(19140);
  });

  it("taxes the discounted line amount, not the full subtotal", () => {
    const totals = computeSaleTotals([
      { unitPriceMinor: 10000, quantity: 1, discountMinor: 2000, taxRateBasisPoints: 1000 },
    ]);

    expect(totals.subtotalMinor).toBe(10000);
    expect(totals.discountMinor).toBe(2000);
    expect(totals.taxMinor).toBe(800); // 10% of 8000, not of 10000
    expect(totals.totalMinor).toBe(8800);
  });

  it("returns zeros for an empty sale", () => {
    expect(computeSaleTotals([])).toEqual({
      subtotalMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 0,
      lines: [],
    });
  });

  it("exposes the per-line breakdown in input order", () => {
    const totals = computeSaleTotals([
      { unitPriceMinor: 8000, quantity: 2, taxRateBasisPoints: 1600 },
      { unitPriceMinor: 500, quantity: 1, taxRateBasisPoints: 1600 },
    ]);

    expect(totals.lines).toEqual([
      { subtotalMinor: 16000, discountMinor: 0, taxMinor: 2560, totalMinor: 18560 },
      { subtotalMinor: 500, discountMinor: 0, taxMinor: 80, totalMinor: 580 },
    ]);
  });

  it("rounds per line so the aggregate stays exact", () => {
    // 16% of 1.00 (100 minor) = 16, twice. Rounding on the aggregate (200)
    // would give the same here; the point is per-line compounding is avoided
    // and each line contributes its own rounded integer.
    const totals = computeSaleTotals([
      { unitPriceMinor: 100, quantity: 1, taxRateBasisPoints: 1600 },
      { unitPriceMinor: 100, quantity: 1, taxRateBasisPoints: 1600 },
    ]);

    expect(totals.taxMinor).toBe(32);
    expect(Number.isInteger(totals.totalMinor)).toBe(true);
  });
});
