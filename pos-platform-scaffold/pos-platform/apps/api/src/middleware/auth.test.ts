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
});
