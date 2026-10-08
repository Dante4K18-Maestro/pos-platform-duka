"use client";

// Business profile: the tenant's display name plus its currency and timezone.
// The name is the same field the dashboard and receipts read.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { BusinessProfile, SettingsSnapshot } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("");
  const [timezone, setTimezone] = useState("");
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
      setProfile(snapshot.profile);
      setName(snapshot.profile.name);
      setCurrency(snapshot.profile.currency);
      setTimezone(snapshot.profile.timezone);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (!name.trim()) return setError("Business name is required.");

    setBusy(true);
    try {
      const updated = await apiFetch<BusinessProfile>("/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          currency: currency.trim(),
          timezone: timezone.trim(),
        }),
      });
      setProfile(updated);
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
      <h1>Business profile</h1>
      <p className="subtitle">Store name, currency and timezone.</p>

      {error && <div className="auth-error">{error}</div>}
      {saved && <div className="badge" style={{ marginBottom: 14 }}>Saved</div>}
      {!profile && !error && <p className="subtitle">Loading…</p>}

      {profile && (
        <div className="card" style={{ maxWidth: 560 }}>
          <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Business name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Currency</span>
              <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="KES" />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Timezone</span>
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Africa/Nairobi"
              />
            </label>
            <p className="subtitle" style={{ margin: 0, fontSize: 12.5 }}>
              Tenant ID <code>{profile.tenantId}</code>
            </p>
            <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "auto" }}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
