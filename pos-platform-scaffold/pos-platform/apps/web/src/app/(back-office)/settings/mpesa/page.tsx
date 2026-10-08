"use client";

// M-Pesa: the merchant-editable half of the Daraja configuration. Secrets
// (consumer key/secret, passkey) live only in server env — this page shows
// whether the server holds them rather than letting them be pasted anywhere.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { MpesaSettings, SettingsSnapshot } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

export default function MpesaSettingsPage() {
  const router = useRouter();
  const [mpesa, setMpesa] = useState<MpesaSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      const snapshot = await apiFetch<SettingsSnapshot>("/settings");
      setMpesa(snapshot.mpesa);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!mpesa) return;
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const updated = await apiFetch<MpesaSettings>("/settings/mpesa", {
        method: "PATCH",
        body: JSON.stringify({
          shortcode: mpesa.shortcode.trim(),
          paybillType: mpesa.paybillType,
          environment: mpesa.environment,
        }),
      });
      setMpesa(updated);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <p className="subtitle" style={{ marginBottom: 4 }}>
        <Link href="/settings">← Settings</Link>
      </p>
      <h1>M-Pesa</h1>
      <p className="subtitle">Daraja STK push defaults and callback wiring.</p>

      {error && <div className="auth-error">{error}</div>}
      {saved && <div className="badge" style={{ marginBottom: 14 }}>Saved</div>}
      {!mpesa && !error && <p className="subtitle">Loading…</p>}

      {mpesa && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            {mpesa.configured ? (
              <p style={{ margin: 0 }}>
                <span className="badge">Live</span> The server holds Daraja credentials —
                M-Pesa sales send a real STK push.
              </p>
            ) : (
              <p style={{ margin: 0 }}>
                <span className="badge pending">Not wired up</span> The server has no Daraja
                credentials, so M-Pesa sales are recorded as pending and never confirmed.
                Set <code>MPESA_CONSUMER_KEY</code>, <code>MPESA_CONSUMER_SECRET</code>,{" "}
                <code>MPESA_PASSKEY</code>, <code>MPESA_SHORTCODE</code> and{" "}
                <code>MPESA_CALLBACK_URL</code> in the API environment.
              </p>
            )}
          </div>

          <div className="card" style={{ maxWidth: 560 }}>
            <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
              <label className="field" style={{ marginBottom: 0 }}>
                <span>Shortcode</span>
                <input
                  value={mpesa.shortcode}
                  onChange={(e) => setMpesa({ ...mpesa, shortcode: e.target.value })}
                  placeholder="174379"
                />
              </label>

              <label className="field" style={{ marginBottom: 0 }}>
                <span>Type</span>
                <select
                  value={mpesa.paybillType}
                  onChange={(e) =>
                    setMpesa({ ...mpesa, paybillType: e.target.value as MpesaSettings["paybillType"] })
                  }
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--line)" }}
                >
                  <option value="PAYBILL">Paybill</option>
                  <option value="TILL">Buy Goods (Till)</option>
                </select>
              </label>

              <label className="field" style={{ marginBottom: 0 }}>
                <span>Environment</span>
                <select
                  value={mpesa.environment}
                  onChange={(e) =>
                    setMpesa({ ...mpesa, environment: e.target.value as MpesaSettings["environment"] })
                  }
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--line)" }}
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="production">Production</option>
                </select>
              </label>

              <p className="subtitle" style={{ margin: 0, fontSize: 12.5 }}>
                Callback URL <code>{mpesa.callbackUrl || "not configured"}</code>
              </p>

              <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "auto" }}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </form>
          </div>
        </>
      )}
    </main>
  );
}
