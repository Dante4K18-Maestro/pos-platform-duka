"use client";

// Stores & registers: the physical shape of the business (GET /stores). Each
// store card lists its tills — the registers a cash session can be opened on.
// The add form posts to POST /stores, which creates the store together with
// its first till (defaulting to "Till 1") in one transaction.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CreateStoreInput, StoresResponse } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

export default function StoresPage() {
  const router = useRouter();
  const [data, setData] = useState<StoresResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CreateStoreInput>({ name: "", registerName: undefined });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      setData(await apiFetch<StoresResponse>("/stores"));
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
      await apiFetch("/stores", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          ...(form.registerName?.trim() ? { registerName: form.registerName.trim() } : {}),
        }),
      });
      setForm({ name: "", registerName: undefined });
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
      <h1>Stores</h1>
      <p className="subtitle">Every location and the tills inside it.</p>

      {error && <div className="auth-error">{error}</div>}

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? "Close" : "+ Add store"}
        </button>
      </div>

      {formOpen && (
        <div className="card" style={{ marginBottom: 16, maxWidth: 560 }}>
          <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Store name *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. Westlands Branch"
              />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>First till</span>
              <input
                value={form.registerName ?? ""}
                onChange={(e) => setForm({ ...form, registerName: e.target.value })}
                placeholder="Till 1"
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim()} style={{ width: "auto" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        </div>
      )}

      {!data && !error && <p className="subtitle">Loading…</p>}

      {data && (
        <>
          <div className="kpi-grid">
            <div className="card kpi">
              <div className="icon">🏬</div>
              <div>
                <p className="label">Stores</p>
                <p className="value">{data.stores.length}</p>
              </div>
            </div>
            <div className="card kpi">
              <div className="icon">🧮</div>
              <div>
                <p className="label">Registers</p>
                <p className="value">{data.registers.length}</p>
              </div>
            </div>
          </div>

          {data.stores.length === 0 && (
            <div className="card">
              <div className="soon">
                <div className="icon">🏬</div>
                <h2>No stores yet</h2>
                <p>Add your first location above to start a till.</p>
              </div>
            </div>
          )}

          <div className="store-grid">
            {data.stores.map((store) => {
              const registers = data.registers.filter((r) => r.storeId === store.id);
              return (
                <div className="card store-card" key={store.id}>
                  <div className="store-card-head">
                    <span className="store-mark">🏪</span>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 17 }}>{store.name}</h2>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>
                        {registers.length} register{registers.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <ul className="register-list">
                    {registers.length === 0 && <li className="muted">No registers.</li>}
                    {registers.map((register) => (
                      <li key={register.id}>
                        <span className="badge">🧮 {register.name}</span>
                        <code>{register.id.slice(0, 8)}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
