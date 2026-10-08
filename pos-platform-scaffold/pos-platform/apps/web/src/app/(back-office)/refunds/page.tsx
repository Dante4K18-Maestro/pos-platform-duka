"use client";

// Refunds: a history of what has gone back, plus a form that starts from a
// sale id and only ever offers what is still refundable on each line. The
// sale id is read from the URL (?sale=...) so Sales can link straight here.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Refund, RefundableSale } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";
import { formatMinor } from "@/lib/format";

export default function RefundsPage() {
  const router = useRouter();
  const [refunds, setRefunds] = useState<Refund[] | null>(null);
  const [saleId, setSaleId] = useState("");
  const [refundable, setRefundable] = useState<RefundableSale | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ refunds: Refund[] }>("/refunds");
      setRefunds(data.refunds);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [router]);

  const loadRefundable = useCallback(
    async (id: string) => {
      if (!id) return;
      setError(null);
      setNotice(null);
      try {
        const data = await apiFetch<RefundableSale>(`/refunds/sale/${id}`);
        setRefundable(data);
        setQuantities({});
      } catch (err) {
        setRefundable(null);
        setError((err as Error).message);
      }
    },
    [],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  // Read ?sale= directly rather than via useSearchParams — no Suspense
  // boundary needed and it behaves the same for a client-only page.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("sale");
    if (fromUrl) {
      setSaleId(fromUrl);
      void loadRefundable(fromUrl);
    }
  }, [loadRefundable]);

  const selected = Object.entries(quantities).filter(([, qty]) => qty > 0);
  const totalMinor =
    refundable?.items.reduce((sum, item) => {
      const qty = quantities[item.saleItemId] ?? 0;
      return sum + item.unitPriceMinor * qty;
    }, 0) ?? 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!refundable) return;
    setError(null);
    setNotice(null);
    if (selected.length === 0) return setError("Choose at least one line to refund.");

    setBusy(true);
    try {
      const created = await apiFetch<Refund>(`/refunds/sale/${refundable.saleId}`, {
        method: "POST",
        body: JSON.stringify({
          items: selected.map(([saleItemId, quantity]) => ({ saleItemId, quantity })),
          ...(reason.trim() ? { reason: reason.trim() } : {}),
          restock,
        }),
      });
      setNotice(`Refunded ${formatMinor(created.totalMinor)} — ${created.items.length} line(s).`);
      setReason("");
      await Promise.all([loadList(), loadRefundable(refundable.saleId)]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Refunds</h1>
      <p className="subtitle">Money back, line by line. Stock returns to the shelf by default.</p>

      {error && <div className="auth-error">{error}</div>}
      {notice && <div className="badge" style={{ marginBottom: 14 }}>{notice}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Refund a sale</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 14 }}>
          <label className="field" style={{ marginBottom: 0, flex: 1 }}>
            <span>Sale ID</span>
            <input
              value={saleId}
              onChange={(e) => setSaleId(e.target.value)}
              placeholder="paste a sale id, or open Sales and click Refund"
            />
          </label>
          <button
            className="btn btn-primary"
            style={{ width: "auto" }}
            type="button"
            onClick={() => void loadRefundable(saleId.trim())}
          >
            Look up
          </button>
        </div>

        {refundable && (
          <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Sold</th>
                  <th>Already refunded</th>
                  <th>Refund now</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {refundable.items.map((item) => (
                  <tr key={item.saleItemId}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.soldQuantity}</td>
                    <td>{item.refundedQuantity}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={item.refundableQuantity}
                        value={quantities[item.saleItemId] ?? 0}
                        disabled={item.refundableQuantity === 0}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            [item.saleItemId]: Math.max(
                              0,
                              Math.min(item.refundableQuantity, Number(e.target.value) || 0),
                            ),
                          }))
                        }
                        style={{ width: 90 }}
                      />
                      <span style={{ marginLeft: 8, fontSize: 12.5, color: "#78716c" }}>
                        of {item.refundableQuantity}
                      </span>
                    </td>
                    <td>{formatMinor(item.unitPriceMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <label className="field" style={{ marginBottom: 0 }}>
              <span>Reason (optional)</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. wrong size"
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={restock}
                onChange={(e) => setRestock(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Put the returned stock back
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "auto" }}>
                {busy ? "Refunding…" : `Refund ${formatMinor(totalMinor)}`}
              </button>
              <span className="subtitle" style={{ margin: 0, fontSize: 13 }}>
                Sale total was {formatMinor(refundable.totalMinor)}
              </span>
            </div>
          </form>
        )}
      </div>

      {!refunds && !error && <p className="subtitle">Loading…</p>}

      {refunds && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Refund history</h3>
          <table className="data">
            <thead>
              <tr>
                <th>Refund</th>
                <th>Sale</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Restocked</th>
                <th>Reason</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {refunds.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "#9ca3af" }}>
                    Nothing refunded yet.
                  </td>
                </tr>
              )}
              {refunds.map((refund) => (
                <tr key={refund.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 12.5 }}>
                    #{refund.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: 12.5 }}>
                    #{refund.saleId.slice(0, 8).toUpperCase()}
                  </td>
                  <td>{refund.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td style={{ fontWeight: 600 }}>{formatMinor(refund.totalMinor)}</td>
                  <td>
                    {refund.restocked ? (
                      <span className="badge">Yes</span>
                    ) : (
                      <span className="badge pending">No</span>
                    )}
                  </td>
                  <td>{refund.reason ?? "—"}</td>
                  <td>
                    {new Date(refund.createdAt).toLocaleString("en-KE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
