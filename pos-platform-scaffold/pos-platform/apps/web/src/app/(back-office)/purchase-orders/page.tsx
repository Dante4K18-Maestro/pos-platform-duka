"use client";

// Purchase orders: what has been ordered from suppliers, and where each order
// is in its life (GET /purchase-orders). The "new order" builder posts a
// DRAFT to POST /purchase-orders — supplier, store, and the lines being
// restocked. Receiving (draft → ordered → received) lands with its own slice.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogProduct, PurchaseOrderListItem, StoresResponse } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";
import { formatMinor } from "@/lib/format";

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "badge",
  ORDERED: "badge pending pn-status",
  RECEIVED: "badge",
  CANCELLED: "badge",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ORDERED: "Ordered",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

interface DraftLine {
  variantId: string;
  name: string;
  quantityOrdered: number;
  unitCostMinor: number;
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrderListItem[] | null>(null);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [stores, setStores] = useState<StoresResponse | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Draft builder state
  const [formOpen, setFormOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      const [ordersData, suppliersData, storesData, catalogData] = await Promise.all([
        apiFetch<{ purchaseOrders: PurchaseOrderListItem[] }>("/purchase-orders"),
        apiFetch<{ suppliers: { id: string; name: string }[] }>("/suppliers"),
        apiFetch<StoresResponse>("/stores"),
        apiFetch<{ products: CatalogProduct[] }>("/catalog"),
      ]);
      setOrders(ordersData.purchaseOrders);
      setSuppliers(suppliersData.suppliers);
      setStores(storesData);
      setProducts(catalogData.products);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const draftTotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantityOrdered * l.unitCostMinor, 0),
    [lines],
  );

  function addLine(variantId: string) {
    if (!variantId || lines.some((l) => l.variantId === variantId)) return;
    const product = products.find((p) => p.id === variantId);
    if (!product) return;
    // Suggest the sell price as the starting cost; editable per line.
    setLines((prev) => [
      ...prev,
      { variantId, name: product.name, quantityOrdered: 1, unitCostMinor: product.priceMinor },
    ]);
  }

  function updateLine(variantId: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, ...patch } : l)));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          supplierId,
          storeId,
          items: lines.map((l) => ({
            variantId: l.variantId,
            quantityOrdered: l.quantityOrdered,
            unitCostMinor: l.unitCostMinor,
          })),
        }),
      });
      setSupplierId("");
      setStoreId("");
      setLines([]);
      setFormOpen(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const open = orders?.filter((o) => o.status === "ORDERED").length ?? 0;
  const value = orders?.reduce((sum, o) => sum + o.totalMinor, 0) ?? 0;

  return (
    <main>
      <h1>Purchase Orders</h1>
      <p className="subtitle">Restocking in flight, from draft to received.</p>

      {error && <div className="auth-error">{error}</div>}

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? "Close" : "+ New order"}
        </button>
      </div>

      {formOpen && (
        <div className="card" style={{ marginBottom: 16 }}>
          <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", alignItems: "end" }}>
              <label className="field" style={{ marginBottom: 0 }}>
                <span>Supplier *</span>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                  <option value="">— pick a supplier —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ marginBottom: 0 }}>
                <span>Deliver to *</span>
                <select value={storeId} onChange={(e) => setStoreId(e.target.value)} required>
                  <option value="">— pick a store —</option>
                  {stores?.stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ marginBottom: 0 }}>
                <span>Add item</span>
                <select value="" onChange={(e) => addLine(e.target.value)}>
                  <option value="">— pick a product —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {lines.length > 0 && (
              <table className="data">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit cost</th>
                    <th>Line total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.variantId}>
                      <td style={{ fontWeight: 600 }}>{line.name}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={line.quantityOrdered}
                          onChange={(e) =>
                            updateLine(line.variantId, { quantityOrdered: Math.max(1, Number(e.target.value) || 1) })
                          }
                          style={{ width: 80 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitCostMinor / 100}
                          onChange={(e) =>
                            updateLine(line.variantId, {
                              unitCostMinor: Math.max(0, Math.round(Number(e.target.value) * 100) || 0),
                            })
                          }
                          style={{ width: 100 }}
                        />
                      </td>
                      <td>{formatMinor(line.quantityOrdered * line.unitCostMinor)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn"
                          style={{ width: "auto", padding: "4px 10px" }}
                          onClick={() => setLines((prev) => prev.filter((l) => l.variantId !== line.variantId))}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>
                Draft total: {formatMinor(draftTotal)}
              </span>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !supplierId || !storeId || lines.length === 0}
                style={{ width: "auto" }}
              >
                {saving ? "Saving…" : "Create draft order"}
              </button>
            </div>
          </form>
        </div>
      )}

      {!orders && !error && <p className="subtitle">Loading…</p>}

      {orders && (
        <>
          <div className="kpi-grid">
            <div className="card kpi">
              <div className="icon">📦</div>
              <div>
                <p className="label">Orders</p>
                <p className="value">{orders.length}</p>
              </div>
            </div>
            <div className="card kpi">
              <div className="icon">⏳</div>
              <div>
                <p className="label">Awaiting delivery</p>
                <p className="value">{open}</p>
              </div>
            </div>
            <div className="card kpi">
              <div className="icon">💰</div>
              <div>
                <p className="label">Total value</p>
                <p className="value">{formatMinor(value)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <table className="data">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Supplier</th>
                  <th>Lines</th>
                  <th>Value</th>
                  <th>Placed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="stagger">
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "#9ca3af" }}>
                      No purchase orders yet.
                    </td>
                  </tr>
                )}
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{order.supplierName}</td>
                    <td>{order.itemCount}</td>
                    <td>{formatMinor(order.totalMinor)}</td>
                    <td>
                      {new Date(order.createdAt).toLocaleDateString([], {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td>
                      <span className={STATUS_CLASS[order.status] ?? "badge"}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
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
