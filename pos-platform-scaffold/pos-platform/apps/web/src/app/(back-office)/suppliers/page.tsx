"use client";

// Suppliers: who the store buys from (GET /suppliers), with order volume so
// the relationship is legible at a glance. The add form posts to
// POST /suppliers; contact info is stored as the { email, phone } JSON blob
// the list renders.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CreateSupplierInput, SupplierListItem } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

function contactLine(info: unknown): string {
  if (!info || typeof info !== "object") return "—";
  const record = info as Record<string, unknown>;
  const parts = [record.email, record.phone].filter((v) => typeof v === "string" && v);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CreateSupplierInput>({ name: "", email: undefined, phone: undefined });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ suppliers: SupplierListItem[] }>("/suppliers");
      setSuppliers(data.suppliers);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/suppliers", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          ...(form.email?.trim() ? { email: form.email.trim() } : {}),
          ...(form.phone?.trim() ? { phone: form.phone.trim() } : {}),
        }),
      });
      setForm({ name: "", email: undefined, phone: undefined });
      setFormOpen(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <h1>Suppliers</h1>
      <p className="subtitle">The businesses that keep your shelves full.</p>

      {error && <div className="auth-error">{error}</div>}

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? "Close" : "+ Add supplier"}
        </button>
      </div>

      {formOpen && (
        <div className="card" style={{ marginBottom: 16 }}>
          <form onSubmit={save} style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", alignItems: "end" }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Name *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. Nairobi Wholesale"
              />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Email</span>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="orders@example.com"
              />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Phone</span>
              <input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="07XX XXX XXX"
                inputMode="tel"
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim()} style={{ width: "auto" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        </div>
      )}

      {!suppliers && !error && <p className="subtitle">Loading…</p>}

      {suppliers && (
        <div className="card">
          <table className="data">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Contact</th>
                <th>Purchase orders</th>
                <th>On file since</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#9ca3af" }}>
                    No suppliers yet.
                  </td>
                </tr>
              )}
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td style={{ fontWeight: 600 }}>
                    <span className="cell-product">
                      <span className="thumb-fallback">🚚</span>
                      {supplier.name}
                    </span>
                  </td>
                  <td>{contactLine(supplier.contactInfo)}</td>
                  <td>
                    <span className="badge">{supplier.purchaseOrderCount}</span>
                  </td>
                  <td>
                    {new Date(supplier.createdAt).toLocaleDateString([], {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
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
