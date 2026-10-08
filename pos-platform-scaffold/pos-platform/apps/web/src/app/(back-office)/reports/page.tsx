"use client";

// Reports: today's numbers, presented as a report rather than the dashboard's
// glance. Reads the same server-resolved "today" window (GET /reports/overview)
// so the two surfaces can never disagree.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReportsOverview } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";
import { formatMinor } from "@/lib/format";

export default function ReportsPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch<ReportsOverview>("/reports/overview"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const average = data && data.orderCount > 0 ? Math.round(data.totalSalesMinor / data.orderCount) : 0;

  return (
    <main>
      <h1>Reports</h1>
      <p className="subtitle">Today&apos;s trading at a glance, resolved server-side.</p>

      <section className="hero-banner">
        <span className="hero-tag">
          <span className="live-dot" aria-hidden /> Live report
        </span>
        <h2>The day, distilled.</h2>
        <p>Sales, average basket and stock pressure — the numbers that decide what you reorder tomorrow morning.</p>
      </section>

      {error && <div className="auth-error">{error}</div>}
      {loading && !data && <p className="subtitle">Loading…</p>}

      {data && (
        <>
          <div className="kpi-grid">
            <div className="card kpi">
              <div className="icon">💰</div>
              <div>
                <p className="label">Gross sales today</p>
                <p className="value">{formatMinor(data.totalSalesMinor)}</p>
              </div>
            </div>
            <div className="card kpi">
              <div className="icon">🧾</div>
              <div>
                <p className="label">Orders</p>
                <p className="value">{data.orderCount}</p>
              </div>
            </div>
            <div className="card kpi">
              <div className="icon">📊</div>
              <div>
                <p className="label">Average basket</p>
                <p className="value">{formatMinor(average)}</p>
              </div>
            </div>
            <div className="card kpi">
              <div className="icon">⚠️</div>
              <div>
                <p className="label">Low stock lines</p>
                <p className="value">{data.lowStockCount}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: 17 }}>Transactions today</h2>
            <table className="data">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Time</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="stagger">
                {data.recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#9ca3af" }}>
                      No sales recorded today.
                    </td>
                  </tr>
                )}
                {data.recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                      #{tx.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td>
                      {new Date(tx.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>{tx.method ?? "—"}</td>
                    <td>{formatMinor(tx.totalMinor)}</td>
                    <td>
                      {tx.paymentStatus ? (
                        <span className={tx.paymentStatus === "CONFIRMED" ? "badge" : "badge pending pn-status"}>
                          {tx.paymentStatus === "CONFIRMED" ? "Confirmed" : "Pending"}
                        </span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>unpaid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
