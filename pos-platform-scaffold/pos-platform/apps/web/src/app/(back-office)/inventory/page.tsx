"use client";

// Back-office inventory: same data as the register's Inventory tab
// (GET /inventory) in the back-office shell.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { InventoryItem } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

const kes = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ items: InventoryItem[] }>("/inventory");
      setItems(data.items);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main>
      <h1>Inventory</h1>
      <p className="subtitle">Stock on hand across all stores.</p>

      {error && <div className="auth-error">{error}</div>}
      {!items && !error && <p className="subtitle">Loading…</p>}

      {items && (
        <div className="card">
          <table className="data">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Category</th>
                <th>On hand</th>
                <th>Price</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#9ca3af" }}>
                    No stock recorded.
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.variantId}>
                  <td style={{ fontFamily: "monospace", fontSize: 12.5 }}>{item.sku}</td>
                  <td>
                    <span className="cell-product">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={item.imageUrl} alt="" loading="lazy" />
                      ) : (
                        <span className="thumb-fallback">📦</span>
                      )}
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                    </span>
                  </td>
                  <td>{item.categoryName ?? "—"}</td>
                  <td>
                    {item.onHand <= 0 ? (
                      <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
                        out of stock
                      </span>
                    ) : item.onHand <= 5 ? (
                      <span className="badge pending">{item.onHand} · low</span>
                    ) : (
                      <span className="badge">{item.onHand}</span>
                    )}
                  </td>
                  <td>{kes.format(item.priceMinor / 100)}</td>
                  <td>
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleDateString([], {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
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
