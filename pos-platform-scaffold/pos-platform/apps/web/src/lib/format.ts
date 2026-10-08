// Money display + input helpers. The API speaks integer minor units
// (see @pos/money); forms speak shillings.
const kes = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });

export function formatMinor(minor: number): string {
  return kes.format((minor ?? 0) / 100);
}

// "1,250" / "1250.50" → 125050 minor units. Returns null for anything that
// isn't a finite, non-negative number, so callers can show a field error
// rather than sending NaN to the API.
export function toMinor(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, "");
  if (cleaned === "") return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

// Minor units → the plain decimal string an <input> expects.
export function toShillingsInput(minor: number): string {
  return (minor / 100).toFixed(2);
}
