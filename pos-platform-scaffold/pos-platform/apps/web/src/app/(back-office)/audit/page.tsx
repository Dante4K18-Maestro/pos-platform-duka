"use client";

// Audit log: the append-only trail of who changed what (GET /audit). Once
// money and refunds are involved, this is not optional.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { AuditEntry } from "@pos/contracts";
import { apiFetch, getAccessToken } from "@/lib/api-client";

export default function AuditPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ entries: AuditEntry[] }>("/audit");
      setEntries(data.entries);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main>
      <h1>Audit log</h1>
      <p className="subtitle">An append-only record of every change that matters.</p>

      {error && <div className="auth-error">{error}</div>}
      {!entries && !error && <p className="subtitle">Loading…</p>}

      {entries && (
        <div className="card">
          <table className="data">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#9ca3af" }}>
                    Nothing recorded yet.
                  </td>
                </tr>
              )}
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    {new Date(entry.createdAt).toLocaleString([], {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <span className="badge">{entry.action}</span>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: 12.5 }}>
                    {entry.entityType}:{entry.entityId.slice(0, 8)}
                  </td>
                  <td>{entry.actorUserId ? entry.actorUserId.slice(0, 8) : "system"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
