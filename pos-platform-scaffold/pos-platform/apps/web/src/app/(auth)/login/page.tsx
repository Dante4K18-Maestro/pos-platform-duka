"use client";

// Email + password login.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@demo.duka");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"admin" | "cashier">("admin");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      // Store chosen mode locally for UI gating (API still enforces roles)
      if (typeof window !== "undefined") {
        localStorage.setItem("pos:auth:mode", mode);
        localStorage.setItem("pos:auth:role", mode === "admin" ? "owner" : "cashier");
      }
      router.push("/pos");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-form-pane">
        <div className="auth-card">
        <div className="auth-brand">
          <div className="logo">🏪</div>
          <div>
            <h1>Duka POS</h1>
            <p>Sign in to your store</p>
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("admin")}
            className={mode === "admin" ? "btn btn-primary flex-1" : "btn btn-secondary flex-1"}
            disabled={busy}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setMode("cashier")}
            className={mode === "cashier" ? "btn btn-primary flex-1" : "btn btn-secondary flex-1"}
            disabled={busy}
          >
            Cashier
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Signing in…" : `Sign in as ${mode === "admin" ? "Admin" : "Cashier"}`}
          </button>
        </form>

        <p className="auth-hint">
          Demo store · <code>owner@demo.duka</code> / <code>demo1234</code>
        </p>
        </div>
      </div>

      <aside className="auth-panel">
        <span className="panel-tag">✨ Built for shops like yours</span>
        <blockquote>
          “We close the till in minutes now — every sale, every shilling,
          accounted for.”
        </blockquote>
        <p className="panel-credit">
          Grace Wanjiru · Owner, Grace Mini Mart, Nairobi
        </p>
      </aside>
    </main>
  );
}
