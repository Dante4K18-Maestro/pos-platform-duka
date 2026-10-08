import { describe, expect, it, vi } from "vitest";
import { registerTenantResolver } from "./tenant";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";

function fakeRequest(headers: Record<string, string>, verify: () => Promise<unknown>) {
  return {
    headers,
    jwtVerify: vi.fn(verify),
    tenantId: undefined as string | undefined,
  };
}

describe("registerTenantResolver", () => {
  it("attaches the tenant from the verified token payload", async () => {
    const request = fakeRequest({ authorization: "Bearer good" }, async () => ({
      tenantId: TENANT_ID,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await registerTenantResolver(request as any);

    expect(request.jwtVerify).toHaveBeenCalledOnce();
    expect(request.tenantId).toBe(TENANT_ID);
  });

  it("does not verify when there is no bearer token", async () => {
    const request = fakeRequest({}, async () => ({ tenantId: TENANT_ID }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await registerTenantResolver(request as any);

    expect(request.jwtVerify).not.toHaveBeenCalled();
    expect(request.tenantId).toBeUndefined();
  });

  it("leaves the tenant unset when verification fails", async () => {
    const request = fakeRequest({ authorization: "Bearer bad" }, async () => {
      throw new Error("bad token");
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await registerTenantResolver(request as any);

    expect(request.tenantId).toBeUndefined();
  });
});
