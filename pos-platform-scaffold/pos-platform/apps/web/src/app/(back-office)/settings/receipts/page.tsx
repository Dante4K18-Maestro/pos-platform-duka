"use client";

// Receipts: header/footer text and whether the printed till slip shows the
// VAT breakdown. Stored per tenant; the receipt printer slice reads these.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReceiptSettings, SettingsSnapshot } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

export default function ReceiptsSettingsPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<ReceiptSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      const snapshot = await apiFetch<SettingsSnapshot>("/settings");
      setReceipts(snapshot.receipts);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  function patch<K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) {
    setReceipts((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!receipts) return;
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const updated = await apiFetch<ReceiptSettings>("/settings/receipts", {
        method: "PATCH",
        body: JSON.stringify(receipts),
      });
      setReceipts(updated);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <p className="subtitle" style={{ marginBottom: 4 }}>
        <Link href="/settings">← Settings</Link>
      </p>
      <h1>Receipts</h1>
      <p className="subtitle">What prints at the top and bottom of a till slip.</p>

      {error && <div className="auth-error">{error}</div>}
      {saved && <div className="badge" style={{ marginBottom: 14 }}>Saved</div>}
      {!receipts && !error && <p className="subtitle">Loading…</p>}

      {receipts && (
        <div className="card" style={{ maxWidth: 620 }}>
          <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Header text</span>
              <input
                value={receipts.headerText}
                onChange={(e) => patch("headerText", e.target.value)}
                placeholder="Duka POS"
              />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Footer text</span>
              <input
                value={receipts.footerText}
                onChange={(e) => patch("footerText", e.target.value)}
                placeholder="Asante kwa kununua nasi!"
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={receipts.showTaxBreakdown}
                onChange={(e) => patch("showTaxBreakdown", e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Show the VAT breakdown on the slip
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={receipts.printAutomatically}
                onChange={(e) => patch("printAutomatically", e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Print automatically after a sale
            </label>

            <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "auto" }}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
