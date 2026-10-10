import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerAuth, signAccessToken } from "./auth";
import { registerTenantResolver } from "./tenant";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";

async function buildTestApp() {
  const app = Fastify();
  await registerAuth(app);
  app.addHook("preHandler", registerTenantResolver);
  app.get("/me", { preHandler: [app.authenticate] }, async (req) => ({ tenantId: req.tenantId }));
  app.get(
    "/office",
    { preHandler: [app.authenticate, app.requireRole("owner", "manager")] },
    async (req) => ({ tenantId: req.tenantId, roles: req.roles }),
  );
  return app;
}

describe("auth guard", () => {
  it("401s a request with no token", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/me" });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    await app.close();
  });

  it("401s a request with a malformed token", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: "Bearer not-a-jwt" },
    });

    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("accepts a signed token and exposes its tenant", async () => {
    const app = await buildTestApp();
    const token = signAccessToken(app, { sub: "user-1", tenantId: TENANT_ID, roles: ["owner"] });
    const res = await app.inject({
      method: "GET",
      url: "/me",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tenantId: TENANT_ID });
    await app.close();
  });

  it("keeps a public route reachable without a token", async () => {
    const app = await buildTestApp();
    app.get("/health", async () => ({ status: "ok" }));

    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("requireRole: lets a token carrying an allowed role through", async () => {
    const app = await buildTestApp();
    const token = signAccessToken(app, { sub: "user-1", tenantId: TENANT_ID, roles: ["owner"] });
    const res = await app.inject({
      method: "GET",
      url: "/office",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tenantId: TENANT_ID, roles: ["owner"] });
    await app.close();
  });

  it("requireRole: 403s a cashier token on a back-office route", async () => {
    const app = await buildTestApp();
    const token = signAccessToken(app, { sub: "user-2", tenantId: TENANT_ID, roles: ["cashier"] });
    const res = await app.inject({
      method: "GET",
      url: "/office",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: { message: "forbidden", code: "FORBIDDEN" } });
    await app.close();
  });

  it("requireRole: 401 — not 403 — when no token is present at all", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/office" });

    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("requireRole: helper guard sends 403 only when no role matches", async () => {
    const app = Fastify();
    await registerAuth(app);
    const guard = app.requireRole("owner", "manager");
    const statuses: number[] = [];
    const reply = {
      status(code: number) { statuses.push(code); return reply; },
      send() { return reply; },
    } as never;
    await guard({ roles: ["cashier"] } as never, reply);
    await guard({ roles: ["owner"] } as never, reply);
    await guard({ roles: ["manager"] } as never, reply);
    await guard({ roles: [] } as never, reply);

    // Only the cashier-sized requests were answered; allowed roles see the
    // handler untouched.
    expect(statuses).toEqual([403, 403]);
    await app.close();
  });
});
