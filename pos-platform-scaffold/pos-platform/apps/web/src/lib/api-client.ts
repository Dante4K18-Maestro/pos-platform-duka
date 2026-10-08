// fetch wrapper + auth refresh.
// Default is the same-origin /api proxy (next.config.mjs rewrites it
// upstream), so the app works from any host — including a phone on the LAN —
// with no CORS. Set NEXT_PUBLIC_API_URL to call the API origin directly.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const ACCESS_TOKEN_KEY = "pos.accessToken";
const REFRESH_TOKEN_KEY = "pos.refreshToken";

export interface Session {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  userId: string;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setSession(session: Session): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
}

export function clearSession(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      // Only declare a JSON body when there is one: a DELETE that claims
      // content-type: application/json but sends nothing is rejected by
      // Fastify before it ever reaches the route.
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `request failed (${res.status})`);
  }
  return body as T;
}

export async function login(email: string, password: string): Promise<Session> {
  const session = await apiFetch<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setSession(session);
  return session;
}
