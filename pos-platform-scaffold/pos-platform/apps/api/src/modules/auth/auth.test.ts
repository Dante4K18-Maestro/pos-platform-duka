import { describe, expect, it, vi } from "vitest";
import { hashPassword } from "../../utils/password";
import type { AuthRepositoryLike, AuthUserRecord } from "./auth.repository";
import { AuthService } from "./auth.service";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const PASSWORD = "demo1234";

async function userRecord(): Promise<AuthUserRecord> {
  return {
    id: USER_ID,
    tenantId: TENANT_ID,
    email: "owner@demo.duka",
    passwordHash: await hashPassword(PASSWORD),
    roles: ["owner"],
  };
}

function fakeRepo(record: AuthUserRecord | null): AuthRepositoryLike {
  return { findByEmail: vi.fn().mockResolvedValue(record) };
}

describe("AuthService.verifyCredentials", () => {
  it("returns the identity for a correct password", async () => {
    const service = new AuthService(fakeRepo(await userRecord()));

    const user = await service.verifyCredentials({ email: "owner@demo.duka", password: PASSWORD });

    expect(user).toEqual({ id: USER_ID, tenantId: TENANT_ID, roles: ["owner"] });
  });

  it("normalises the email before lookup", async () => {
    const repo = fakeRepo(await userRecord());
    const service = new AuthService(repo);

    await service.verifyCredentials({ email: "  Owner@Demo.Duka ", password: PASSWORD });

    expect(repo.findByEmail).toHaveBeenCalledWith("owner@demo.duka");
  });

  it("returns null for a wrong password", async () => {
    const service = new AuthService(fakeRepo(await userRecord()));

    expect(await service.verifyCredentials({ email: "owner@demo.duka", password: "nope" })).toBeNull();
  });

  it("returns null for an unknown email", async () => {
    const service = new AuthService(fakeRepo(null));

    expect(await service.verifyCredentials({ email: "ghost@demo.duka", password: PASSWORD })).toBeNull();
  });
});
