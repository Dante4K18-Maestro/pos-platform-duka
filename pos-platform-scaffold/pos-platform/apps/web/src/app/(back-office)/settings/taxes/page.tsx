"use client";

// Taxes: the tenant's VAT rates as real rows. The rate the register charges
// is the tenant's earliest active rate (see the sales service), so editing
// the seeded row changes what the till computes.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { TaxRate } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

// Percent in the form, basis points on the wire.
function percentToBasisPoints(value: string): number | null {
  const parsed = Number(value.replace(/[,\s]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return Math.round(parsed * 100);
}

export default function TaxesSettingsPage() {
  const router = useRouter();
  const [rates, setRates] = useState<TaxRate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("16");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ rates: TaxRate[] }>("/settings/taxes");
      setRates(data.rates);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const bp = percentToBasisPoints(percent);
    if (!name.trim()) return setError("Give the rate a name.");
    if (bp === null) return setError("Rate must be a percentage between 0 and 100.");

    setBusy(true);
    try {
      await apiFetch("/settings/taxes", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), rateBasisPoints: bp }),
      });
      setName("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save(id: string) {
    setError(null);
    const bp = percentToBasisPoints(editing[id]);
    if (bp === null) return setError("Rate must be a percentage between 0 and 100.");

    setBusy(true);
    try {
      await apiFetch(`/settings/taxes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ rateBasisPoints: bp }),
      });
      setEditing((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/settings/taxes/${id}`, { method: "DELETE" });
      await load();
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
      <h1>Taxes</h1>
      <p className="subtitle">VAT rates. The oldest active rate is what the register charges.</p>

      {error && <div className="auth-error">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <form
          onSubmit={add}
          style={{ display: "grid", gap: 12, gridTemplateColumns: "2fr 1fr auto", alignItems: "end" }}
        >
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VAT 16%" />
          </label>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Rate (%)</span>
            <input
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              inputMode="decimal"
              placeholder="16"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "auto" }}>
            Add rate
          </button>
        </form>
      </div>

      {!rates && !error && <p className="subtitle">Loading…</p>}

      {rates && (
        <div className="card">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Rate</th>
                <th style={{ width: 240 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", color: "#9ca3af" }}>
                    No tax rates — the register will charge 0%.
                  </td>
                </tr>
              )}
              {rates.map((rate) => (
                <tr key={rate.id}>
                  <td style={{ fontWeight: 600 }}>{rate.name}</td>
                  <td>
                    {editing[rate.id] !== undefined ? (
                      <input
                        value={editing[rate.id]}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [rate.id]: e.target.value }))}
                        style={{ width: 90 }}
                        inputMode="decimal"
                      />
                    ) : (
                      <span className="badge">{(rate.rateBasisPoints / 100).toFixed(2)}%</span>
                    )}
                  </td>
                  <td>
                    {editing[rate.id] !== undefined ? (
                      <span style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-primary" style={{ width: "auto" }} disabled={busy} onClick={() => void save(rate.id)}>
                          Save
                        </button>
                        <button
                          className="btn"
                          style={{ width: "auto", background: "#f5f0e8", color: "#57534e" }}
                          onClick={() =>
                            setEditing((prev) => {
                              const next = { ...prev };
                              delete next[rate.id];
                              return next;
                            })
                          }
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <span style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn"
                          style={{ width: "auto", background: "#f5f0e8", color: "#57534e" }}
                          onClick={() =>
                            setEditing((prev) => ({
                              ...prev,
                              [rate.id]: (rate.rateBasisPoints / 100).toString(),
                            }))
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="btn"
                          style={{ width: "auto", background: "#fef2f2", color: "#dc2626" }}
                          disabled={busy}
                          onClick={() => void remove(rate.id)}
                        >
                          Delete
                        </button>
                      </span>
                    )}
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
