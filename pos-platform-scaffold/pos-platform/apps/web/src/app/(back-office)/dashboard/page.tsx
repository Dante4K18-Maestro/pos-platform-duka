"use client";

// Back-office dashboard: today's KPIs and the latest transactions, same
// numbers the register's dashboard tab shows (server resolves "today").
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReportsOverview } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

const kes = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Formatted in an effect so server and client first render match.
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" }),
    );
  }, []);

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

  return (
    <main>
      <h1>Dashboard</h1>
      <p className="subtitle">Here&apos;s what&apos;s happening at your store today.</p>

      <section className="hero-banner">
        <span className="hero-tag">
          <span className="live-dot" aria-hidden /> {today || "Today"} — live from the till
        </span>
        <h2>Welcome back — your store is in good hands.</h2>
        <p>
          Sales, orders and stock health, live from the register. Works online
          or off, and syncs when you&apos;re back.
        </p>
      </section>

      {error && <div className="auth-error">{error}</div>}
      {loading && !data && <p className="subtitle">Loading…</p>}

      {data && (
        <>
          <div className="kpi-grid">
            <div className="card kpi">
              <div className="icon">💰</div>
              <div>
                <p className="label">Total sales today</p>
                <p className="value">{kes.format(data.totalSalesMinor / 100)}</p>
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
              <div className="icon">👥</div>
              <div>
                <p className="label">Customers</p>
                <p className="value">{data.customerCount}</p>
              </div>
            </div>
            <div className="card kpi">
              <div className="icon">⚠️</div>
              <div>
                <p className="label">Low stock</p>
                <p className="value">{data.lowStockCount}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: 17 }}>Recent transactions</h2>
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
              <tbody>
                {data.recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#9ca3af" }}>
                      No sales yet today.
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
                    <td>{kes.format(tx.totalMinor / 100)}</td>
                    <td>
                      {tx.paymentStatus ? (
                        <span
                          className={
                            tx.paymentStatus === "CONFIRMED" ? "badge" : "badge pending pn-status"
                          }
                        >
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
