"use client";

// Back-office customers: live CRM rows (GET /customers) plus the same
// add-customer flow the register offers (POST /customers).
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CustomerSummary } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

const kes = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });

// 07XX/01XX → 2547XXXXXXXX, matching the API contract.
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(digits)) return "254" + digits.slice(1);
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^[17]\d{8}$/.test(digits)) return "254" + digits;
  return null;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ customers: CustomerSummary[] }>("/customers");
      setCustomers(data.customers);
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
      const phoneDigits = phone.trim() ? normalizePhone(phone) : null;
      if (phone.trim() && !phoneDigits) {
        throw new Error("Phone must be a valid Kenyan number (e.g. 0712 345 678).");
      }
      await apiFetch("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          ...(phoneDigits ? { phone: phoneDigits } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
        }),
      });
      setName("");
      setPhone("");
      setEmail("");
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
      <h1>Customers</h1>
      <p className="subtitle">Walk-ins and regulars, with their lifetime spend.</p>

      {error && <div className="auth-error">{error}</div>}

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? "Close" : "+ Add customer"}
        </button>
      </div>

      {formOpen && (
        <div className="card" style={{ marginBottom: 16 }}>
          <form onSubmit={save} style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", alignItems: "end" }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Name *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" inputMode="numeric" />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            </label>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: "auto" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        </div>
      )}

      {!customers && !error && <p className="subtitle">Loading…</p>}

      {customers && (
        <div className="card">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Orders</th>
                <th>Lifetime spend</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#9ca3af" }}>
                    No customers yet.
                  </td>
                </tr>
              )}
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td style={{ fontWeight: 600 }}>{customer.name}</td>
                  <td>{customer.phone ?? "—"}</td>
                  <td>{customer.email ?? "—"}</td>
                  <td>{customer.orderCount}</td>
                  <td>{kes.format(customer.spendMinor / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
