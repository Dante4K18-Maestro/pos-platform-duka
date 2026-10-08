"use client";

// Back-office products: the sellable catalog (GET /catalog) — what the
// register sells, at what price, with current stock. Editing arrives with
// the catalog-management slice.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CatalogProduct } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

const kes = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<CatalogProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ products: CatalogProduct[] }>("/catalog");
      setProducts(data.products);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main>
      <h1>Products</h1>
      <p className="subtitle">The sellable catalog, exactly as the register shows it.</p>

      {error && <div className="auth-error">{error}</div>}
      {!products && !error && <p className="subtitle">Loading…</p>}

      {products && (
        <div className="card">
          <table className="data">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Category</th>
                <th>Barcode</th>
                <th>Price</th>
                <th>On hand</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#9ca3af" }}>
                    No products yet.
                  </td>
                </tr>
              )}
              {products.map((product) => (
                <tr key={product.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 12.5 }}>{product.sku}</td>
                  <td>
                    <span className="cell-product">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={product.imageUrl} alt="" loading="lazy" />
                      ) : (
                        <span className="thumb-fallback">📦</span>
                      )}
                      <Link href={`/products/${product.id}`} style={{ fontWeight: 600 }}>
                        {product.name}
                      </Link>
                    </span>
                  </td>
                  <td>{product.categoryName ?? "—"}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12.5 }}>
                    {product.barcode ?? "—"}
                  </td>
                  <td>{kes.format(product.priceMinor / 100)}</td>
                  <td>
                    <span className="badge">{product.onHand}</span>
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
