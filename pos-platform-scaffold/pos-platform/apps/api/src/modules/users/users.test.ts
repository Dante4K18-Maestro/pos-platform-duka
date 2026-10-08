import { describe, expect, it, vi } from "vitest";
import type { StaffRecord, UsersRepositoryLike } from "./users.repository";
import { defaultPermissions } from "./users.repository";
import { StaffConflictError, StaffNotFoundError, UsersService } from "./users.service";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";

function record(overrides: Partial<StaffRecord> = {}): StaffRecord {
  return {
    id: USER_ID,
    email: "cashier@demo.duka",
    roles: ["cashier"],
    hasPin: false,
    createdAt: "2026-10-07T08:00:00.000Z",
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<UsersRepositoryLike> = {}): UsersRepositoryLike {
  return {
    list: vi.fn().mockResolvedValue([record()]),
    listRoleNames: vi.fn().mockResolvedValue(["cashier", "owner"]),
    findByEmail: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(record()),
    create: vi.fn().mockResolvedValue(record()),
    update: vi.fn().mockResolvedValue(record({ roles: ["cashier", "manager"] })),
    ...overrides,
  };
}

describe("defaultPermissions", () => {
  it("gives a brand-new role something usable rather than nothing", () => {
    expect(defaultPermissions("cashier")).toEqual(["sale.create"]);
    expect(defaultPermissions("Owner")).toContain("settings.manage");
    // An unknown name still gets the minimum needed to ring up a sale.
    expect(defaultPermissions("floor lead")).toEqual(["sale.create"]);
  });
});

describe("UsersService.list", () => {
  it("returns the staff and the tenant's role names together", async () => {
    const service = new UsersService(fakeRepo());

    const result = await service.list(TENANT_ID);

    expect(result.staff).toHaveLength(1);
    expect(result.roles).toEqual(["cashier", "owner"]);
  });
});

describe("UsersService.create", () => {
  it("hashes the password and never stores it in the clear", async () => {
    const repo = fakeRepo();
    const service = new UsersService(repo);

    await service.create(TENANT_ID, {
      email: "New.Cashier@Demo.Duka",
      password: "supersecret1",
      roles: ["cashier"],
    });

    const args = vi.mocked(repo.create).mock.calls[0][1];
    expect(args.passwordHash).toMatch(/^scrypt\$/);
    expect(args.passwordHash).not.toContain("supersecret1");
    // Email is the login handle, so it is normalised on the way in.
    expect(args.email).toBe("new.cashier@demo.duka");
    expect(args.roleNames).toEqual(["cashier"]);
  });

  it("hashes a PIN when one is given, and omits it otherwise", async () => {
    const repo = fakeRepo();
    const service = new UsersService(repo);

    await service.create(TENANT_ID, {
      email: "with.pin@demo.duka",
      password: "supersecret1",
      pin: "4321",
      roles: ["cashier"],
    });
    expect(vi.mocked(repo.create).mock.calls[0][1].pinHash).toMatch(/^scrypt\$/);

    await service.create(TENANT_ID, {
      email: "no.pin@demo.duka",
      password: "supersecret1",
      roles: ["cashier"],
    });
    expect(vi.mocked(repo.create).mock.calls[1][1].pinHash).toBeUndefined();
  });

  it("refuses an email that already exists at this tenant", async () => {
    const repo = fakeRepo({ findByEmail: vi.fn().mockResolvedValue({ id: USER_ID }) });
    const service = new UsersService(repo);

    await expect(
      service.create(TENANT_ID, {
        email: "cashier@demo.duka",
        password: "supersecret1",
        roles: ["cashier"],
      }),
    ).rejects.toBeInstanceOf(StaffConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe("UsersService.update", () => {
  it("404s for a staff member the tenant does not own", async () => {
    const repo = fakeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = new UsersService(repo);

    await expect(service.update(TENANT_ID, USER_ID, { roles: ["cashier"] })).rejects.toBeInstanceOf(
      StaffNotFoundError,
    );
  });

  it("clears a PIN when it is explicitly set to null", async () => {
    const repo = fakeRepo();
    const service = new UsersService(repo);

    await service.update(TENANT_ID, USER_ID, { pin: null });

    expect(vi.mocked(repo.update).mock.calls[0][2].pinHash).toBeNull();
  });

  it("sends only the fields the caller actually changed", async () => {
    const repo = fakeRepo();
    const service = new UsersService(repo);

    await service.update(TENANT_ID, USER_ID, { roles: ["manager"] });

    const patch = vi.mocked(repo.update).mock.calls[0][2];
    expect(patch.roleNames).toEqual(["manager"]);
    expect(patch.passwordHash).toBeUndefined();
    expect(patch.pinHash).toBeUndefined();
  });
});
