"use client";

// Cash sessions: open a drawer with a float, record cash drops and pay-outs,
// then close against a physical count. The variance the server computes at
// close is what the history shows — it is never recomputed afterwards.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CashSession, Register } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";
import { formatMinor, toMinor } from "@/lib/format";

export default function CashSessionPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CashSession[] | null>(null);
  const [open, setOpen] = useState<CashSession | null>(null);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [registerId, setRegisterId] = useState("");
  const [floatInput, setFloatInput] = useState("0");

  const [moveType, setMoveType] = useState<"PAY_IN" | "PAY_OUT">("PAY_IN");
  const [moveAmount, setMoveAmount] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [countedInput, setCountedInput] = useState("");

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      const [cash, stores] = await Promise.all([
        apiFetch<{ sessions: CashSession[]; open: CashSession | null }>("/cash-sessions"),
        apiFetch<{ registers: Register[] }>("/stores"),
      ]);
      setSessions(cash.sessions);
      setOpen(cash.open);
      setRegisters(stores.registers);
      setRegisterId((current) => current || stores.registers[0]?.id || "");
    } catch (err) {
      setError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openDrawer(event: React.FormEvent) {
    event.preventDefault();
    const minor = toMinor(floatInput);
    if (minor === null) return setError("Opening float must be a number.");
    if (!registerId) return setError("Pick a register.");
    await run(() =>
      apiFetch("/cash-sessions", {
        method: "POST",
        body: JSON.stringify({ registerId, openingFloatMinor: minor }),
      }),
    );
  }

  async function addMovement(event: React.FormEvent) {
    event.preventDefault();
    if (!open) return;
    const minor = toMinor(moveAmount);
    if (minor === null || minor === 0) return setError("Amount must be greater than zero.");
    if (moveType === "PAY_OUT" && !moveReason.trim()) return setError("A pay-out needs a reason.");
    await run(() =>
      apiFetch(`/cash-sessions/${open.id}/movements`, {
        method: "POST",
        body: JSON.stringify({
          type: moveType,
          amountMinor: minor,
          ...(moveReason.trim() ? { reason: moveReason.trim() } : {}),
        }),
      }),
    );
    setMoveAmount("");
    setMoveReason("");
  }

  async function closeDrawer(event: React.FormEvent) {
    event.preventDefault();
    if (!open) return;
    const minor = toMinor(countedInput);
    if (minor === null) return setError("Counted amount must be a number.");
    await run(() =>
      apiFetch(`/cash-sessions/${open.id}/close`, {
        method: "POST",
        body: JSON.stringify({ countedCloseMinor: minor }),
      }),
    );
    setCountedInput("");
  }

  return (
    <main>
      <h1>Cash sessions</h1>
      <p className="subtitle">Opening floats, cash drops and end-of-day counts.</p>

      {error && <div className="auth-error">{error}</div>}
      {!sessions && !error && <p className="subtitle">Loading…</p>}

      {!open && sessions && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Open a drawer</h3>
          {registers.length === 0 ? (
            <p className="subtitle" style={{ margin: 0 }}>
              No registers are configured for this tenant.
            </p>
          ) : (
            <form
              onSubmit={openDrawer}
              style={{ display: "grid", gap: 12, gridTemplateColumns: "2fr 1fr auto", alignItems: "end" }}
            >
              <label className="field" style={{ marginBottom: 0 }}>
                <span>Register</span>
                <select
                  value={registerId}
                  onChange={(e) => setRegisterId(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--line)" }}
                >
                  {registers.map((register) => (
                    <option key={register.id} value={register.id}>
                      {register.name} · {register.storeName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ marginBottom: 0 }}>
                <span>Opening float (KES)</span>
                <input
                  value={floatInput}
                  onChange={(e) => setFloatInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="2000"
                />
              </label>
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "auto" }}>
                Open
              </button>
            </form>
          )}
        </div>
      )}

      {open && (
        <>
          <div className="kpi-grid">
            <div className="card kpi">
              <div className="icon">🪙</div>
              <div>
                <p className="label">Opening float</p>
                <p className="value">{formatMinor(open.openingFloatMinor)}</p>
              </div>
            </div>
            <div className="card kpi">
              <div className="icon">💵</div>
              <div>
                <p className="label">Cash sales</p>
                <p className="value">{formatMinor(open.cashSalesMinor)}</p>
              </div>
            </div>
            <div className="card kpi">
              <div className="icon">📥</div>
              <div>
                <p className="label">Paid in / out</p>
                <p className="value">
                  {formatMinor(open.payInMinor)} / {formatMinor(open.payOutMinor)}
                </p>
              </div>
            </div>
            <div className="card kpi">
              <div className="icon">🧾</div>
              <div>
                <p className="label">Expected in drawer</p>
                <p className="value">{formatMinor(open.expectedCashMinor)}</p>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>
              {open.registerName} · open since{" "}
              {new Date(open.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </h3>

            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              }}
            >
              <form onSubmit={addMovement} style={{ display: "grid", gap: 12 }}>
                <strong style={{ fontSize: 14 }}>Record a cash movement</strong>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span>Type</span>
                    <select
                      value={moveType}
                      onChange={(e) => setMoveType(e.target.value as "PAY_IN" | "PAY_OUT")}
                      style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--line)" }}
                    >
                      <option value="PAY_IN">Pay in</option>
                      <option value="PAY_OUT">Pay out</option>
                    </select>
                  </label>
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span>Amount (KES)</span>
                    <input
                      value={moveAmount}
                      onChange={(e) => setMoveAmount(e.target.value)}
                      inputMode="decimal"
                      placeholder="500"
                    />
                  </label>
                </div>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span>Reason {moveType === "PAY_OUT" ? "(required)" : "(optional)"}</span>
                  <input
                    value={moveReason}
                    onChange={(e) => setMoveReason(e.target.value)}
                    placeholder="e.g. change from the back office"
                  />
                </label>
                <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "auto" }}>
                  Record movement
                </button>
              </form>

              <form onSubmit={closeDrawer} style={{ display: "grid", gap: 12, alignContent: "start" }}>
                <strong style={{ fontSize: 14 }}>Close the drawer</strong>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span>Counted cash (KES)</span>
                  <input
                    value={countedInput}
                    onChange={(e) => setCountedInput(e.target.value)}
                    inputMode="decimal"
                    placeholder={String(open.expectedCashMinor / 100)}
                  />
                </label>
                <p className="subtitle" style={{ margin: 0, fontSize: 12.5 }}>
                  The variance against {formatMinor(open.expectedCashMinor)} is recorded as counted.
                </p>
                <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "auto" }}>
                  Close session
                </button>
              </form>
            </div>
          </div>

          {open.movements.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>Movements this session</h3>
              <table className="data">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {open.movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>
                        <span className={movement.type === "PAY_IN" ? "badge" : "badge pending"}>
                          {movement.type === "PAY_IN" ? "Pay in" : "Pay out"}
                        </span>
                      </td>
                      <td>{formatMinor(movement.amountMinor)}</td>
                      <td>{movement.reason ?? "—"}</td>
                      <td>
                        {new Date(movement.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {sessions && sessions.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>History</h3>
          <table className="data">
            <thead>
              <tr>
                <th>Register</th>
                <th>Opened</th>
                <th>Float</th>
                <th>Expected</th>
                <th>Counted</th>
                <th>Variance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td style={{ fontWeight: 600 }}>{session.registerName}</td>
                  <td>
                    {new Date(session.createdAt).toLocaleString("en-KE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>{formatMinor(session.openingFloatMinor)}</td>
                  <td>{formatMinor(session.expectedCashMinor)}</td>
                  <td>
                    {session.countedCloseMinor === null ? "—" : formatMinor(session.countedCloseMinor)}
                  </td>
                  <td>
                    {session.computedVarianceMinor === null ? (
                      "—"
                    ) : (
                      <span
                        className="badge"
                        style={
                          session.computedVarianceMinor === 0
                            ? undefined
                            : { background: "#fee2e2", color: "#b91c1c" }
                        }
                      >
                        {session.computedVarianceMinor > 0 ? "+" : ""}
                        {formatMinor(session.computedVarianceMinor)}
                      </span>
                    )}
                  </td>
                  <td>
                    {session.closedAt ? (
                      <span className="badge">Closed</span>
                    ) : (
                      <span className="badge pending">Open</span>
                    )}
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
