"use client";

// Categories: the shelf taxonomy (GET /categories) with a direct product
// count per category so the register's filter bar has a visible shape here.
// The add form posts to POST /categories; a parent is optional.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CategoryListItem, CreateCategoryInput } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CreateCategoryInput>({ name: "", parentId: null });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ categories: CategoryListItem[] }>("/categories");
      setCategories(data.categories);
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
      await apiFetch("/categories", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          ...(form.parentId ? { parentId: form.parentId } : { parentId: null }),
        }),
      });
      setForm({ name: "", parentId: null });
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
      <h1>Categories</h1>
      <p className="subtitle">How the catalog is grouped on the register.</p>

      {error && <div className="auth-error">{error}</div>}

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? "Close" : "+ Add category"}
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
                placeholder="e.g. Beverages"
              />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Parent</span>
              <select
                value={form.parentId ?? ""}
                onChange={(e) => setForm({ ...form, parentId: e.target.value || null })}
              >
                <option value="">— none (top level) —</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim()} style={{ width: "auto" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        </div>
      )}

      {!categories && !error && <p className="subtitle">Loading…</p>}

      {categories && (
        <div className="card">
          <table className="data">
            <thead>
              <tr>
                <th>Category</th>
                <th>Parent</th>
                <th>Products</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", color: "#9ca3af" }}>
                    No categories yet.
                  </td>
                </tr>
              )}
              {categories.map((category) => (
                <tr key={category.id}>
                  <td style={{ fontWeight: 600 }}>
                    {category.parentName && <span className="tree-pad" />}
                    {category.name}
                  </td>
                  <td>{category.parentName ?? "—"}</td>
                  <td>
                    <span className="badge">{category.productCount}</span>
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
