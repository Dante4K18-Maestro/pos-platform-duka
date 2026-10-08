"use client";

// Product detail. There is no per-product endpoint yet, so this reads the
// catalog and the inventory list and joins them on the variant id — which is
// exactly how the register and the inventory tab already see the same thing.
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CatalogProduct, InventoryItem } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";
import { formatMinor } from "@/lib/format";

// Fallback only — a product with no resolved picture still gets a styled hero.
const HERO =
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1600&auto=format&fit=crop";

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [stock, setStock] = useState<InventoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!id) return;
    try {
      const [catalog, inventory] = await Promise.all([
        apiFetch<{ products: CatalogProduct[] }>("/catalog"),
        apiFetch<{ items: InventoryItem[] }>("/inventory"),
      ]);
      setProduct(catalog.products.find((item) => item.id === id) ?? null);
      setStock(inventory.items.find((item) => item.variantId === id) ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoaded(true);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main>
      <p className="subtitle" style={{ marginBottom: 4 }}>
        <Link href="/products">← Products</Link>
      </p>

      {error && <div className="auth-error">{error}</div>}
      {!loaded && !error && <p className="subtitle">Loading…</p>}

      {loaded && !product && !error && (
        <div className="card">
          <div className="soon">
            <div className="icon">📦</div>
            <h2>Product not found</h2>
            <p>No variant with that id is in this tenant&apos;s catalog.</p>
          </div>
        </div>
      )}

      {product && (
        <>
          <div className="hero-banner" style={{ backgroundImage: `linear-gradient(100deg, rgb(4 120 87 / 92%) 0%, rgb(5 150 105 / 78%) 45%, rgb(41 37 36 / 35%) 100%), url("${product.imageUrl ?? HERO}")` }}>
            <span className="hero-tag">📦 {product.categoryName ?? "Uncategorised"}</span>
            <h1>{product.name}</h1>
            <p>SKU {product.sku}</p>
          </div>

          <div className="kpi-grid">
            <div className="card kpi">
              <div className="icon">💰</div>
              <div>
                <p className="label">Price</p>
                <p className="value">{formatMinor(product.priceMinor)}</p>
              </div>
            </div>
            <div className="card kpi">
              <div className="icon">📊</div>
              <div>
                <p className="label">On hand</p>
                <p className="value">{product.onHand}</p>
              </div>
            </div>
            <div className="card kpi">
              <div className="icon">🏷️</div>
              <div>
                <p className="label">Barcode</p>
                <p className="value" style={{ fontFamily: "monospace", fontSize: 16 }}>
                  {product.barcode ?? "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Stock</h3>
            <table className="data">
              <thead>
                <tr>
                  <th>Variant ID</th>
                  <th>On hand</th>
                  <th>Status</th>
                  <th>Last updated</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontFamily: "monospace", fontSize: 12.5 }}>{product.id}</td>
                  <td>{product.onHand}</td>
                  <td>
                    {product.onHand <= 0 ? (
                      <span className="badge" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                        out of stock
                      </span>
                    ) : product.onHand <= 5 ? (
                      <span className="badge pending">low</span>
                    ) : (
                      <span className="badge">in stock</span>
                    )}
                  </td>
                  <td>
                    {stock?.updatedAt
                      ? new Date(stock.updatedAt).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
