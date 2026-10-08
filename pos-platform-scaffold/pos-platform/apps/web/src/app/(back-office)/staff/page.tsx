"use client";

// Staff: who can sign in, and with what roles. A PIN is the shared-device
// unlock a cashier uses; the password is the back-office login.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { StaffMember } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

interface StaffResponse {
  staff: StaffMember[];
  roles: string[];
}

export default function StaffPage() {
  const router = useRouter();
  const [data, setData] = useState<StaffResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [customRole, setCustomRole] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editPin, setEditPin] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      setData(await apiFetch<StaffResponse>("/users"));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(list: string[], setList: (next: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim()) return setError("Email is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (pin && !/^\d{4,6}$/.test(pin)) return setError("PIN must be 4 to 6 digits.");
    if (roles.length === 0) return setError("Pick at least one role.");

    setBusy(true);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          ...(pin ? { pin } : {}),
          roles,
        }),
      });
      setEmail("");
      setPassword("");
      setPin("");
      setRoles([]);
      setNotice("Staff member added.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    setError(null);
    setNotice(null);
    if (editPin && !/^\d{4,6}$/.test(editPin)) return setError("PIN must be 4 to 6 digits.");
    if (editPassword && editPassword.length < 8) {
      return setError("Password must be at least 8 characters.");
    }

    setBusy(true);
    try {
      await apiFetch(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          roles: editRoles,
          ...(editPin ? { pin: editPin } : {}),
          ...(editPassword ? { password: editPassword } : {}),
        }),
      });
      setEditingId(null);
      setEditPin("");
      setEditPassword("");
      setNotice("Staff member updated.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const roleOptions = data?.roles ?? [];
  const allRoles = [...new Set([...roleOptions, ...roles, ...editRoles])];

  return (
    <main>
      <h1>Staff</h1>
      <p className="subtitle">Cashiers, managers and their roles.</p>

      {error && <div className="auth-error">{error}</div>}
      {notice && <div className="badge" style={{ marginBottom: 14 }}>{notice}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Add a staff member</h3>
        <form onSubmit={add} style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cashier@demo.duka"
              />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="at least 8 characters"
              />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>PIN (4–6 digits, optional)</span>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                inputMode="numeric"
                placeholder="1234"
              />
            </label>
          </div>

          <div>
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 8 }}>
              Roles
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {allRoles.map((role) => (
                <label key={role} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={roles.includes(role)}
                    onChange={() => toggle(roles, setRoles, role)}
                    style={{ width: 16, height: 16 }}
                  />
                  {role}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <input
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="add a role name"
                style={{ padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 10 }}
              />
              <button
                type="button"
                className="btn"
                style={{ width: "auto", background: "#f5f0e8", color: "#57534e" }}
                onClick={() => {
                  const name = customRole.trim();
                  if (!name) return;
                  if (!roles.includes(name)) setRoles([...roles, name]);
                  setCustomRole("");
                }}
              >
                Add role
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "auto" }}>
            {busy ? "Saving…" : "Add staff member"}
          </button>
        </form>
      </div>

      {!data && !error && <p className="subtitle">Loading…</p>}

      {data && (
        <div className="card">
          <table className="data">
            <thead>
              <tr>
                <th>Email</th>
                <th>Roles</th>
                <th>PIN</th>
                <th style={{ width: 120 }} />
              </tr>
            </thead>
            <tbody>
              {data.staff.map((member) => (
                <tr key={member.id}>
                  <td style={{ fontWeight: 600 }}>{member.email}</td>
                  <td>
                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {member.roles.length === 0 ? (
                        <span style={{ color: "#9ca3af" }}>none</span>
                      ) : (
                        member.roles.map((role) => (
                          <span key={role} className="badge">
                            {role}
                          </span>
                        ))
                      )}
                    </span>
                  </td>
                  <td>
                    {member.hasPin ? (
                      <span className="badge">set</span>
                    ) : (
                      <span className="badge pending">none</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn"
                      style={{ width: "auto", background: "#f5f0e8", color: "#57534e" }}
                      onClick={() => {
                        setEditingId(editingId === member.id ? null : member.id);
                        setEditRoles(member.roles);
                        setEditPin("");
                        setEditPassword("");
                      }}
                    >
                      {editingId === member.id ? "Close" : "Edit"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {editingId && (
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
              <strong style={{ fontSize: 14 }}>
                Editing {data.staff.find((member) => member.id === editingId)?.email}
              </strong>
              <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                  {allRoles.map((role) => (
                    <label key={role} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14 }}>
                      <input
                        type="checkbox"
                        checked={editRoles.includes(role)}
                        onChange={() => toggle(editRoles, setEditRoles, role)}
                        style={{ width: 16, height: 16 }}
                      />
                      {role}
                    </label>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span>New PIN (optional)</span>
                    <input
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value)}
                      inputMode="numeric"
                      placeholder="1234"
                    />
                  </label>
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span>New password (optional)</span>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="at least 8 characters"
                    />
                  </label>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: "auto" }}
                  disabled={busy || editRoles.length === 0}
                  onClick={() => void saveEdit(editingId)}
                >
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
