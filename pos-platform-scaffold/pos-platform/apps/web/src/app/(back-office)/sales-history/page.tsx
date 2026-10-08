"use client";

// Back-office sales history: today's transactions from the reports feed.
// Date-range queries and void/refund actions arrive with the reports slice.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReportsOverview } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

const kes = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });

export default function SalesHistoryPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      setData(await apiFetch<ReportsOverview>("/reports/overview"));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = data?.recentTransactions ?? [];

  return (
    <main>
      <h1>Sales</h1>
      <p className="subtitle">Today&apos;s transactions ({data?.orderCount ?? 0} orders).</p>

      {error && <div className="auth-error">{error}</div>}
      {!data && !error && <p className="subtitle">Loading…</p>}

      {data && (
        <div className="card">
          <table className="data">
            <thead>
              <tr>
                <th>Order</th>
                <th>Time</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#9ca3af" }}>
                    No sales yet today.
                  </td>
                </tr>
              )}
              {rows.map((tx) => (
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
                  <td>
                    <Link href={`/refunds?sale=${tx.id}`}>Refund</Link>
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
