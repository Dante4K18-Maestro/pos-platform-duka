// Staff (users) data access — Prisma queries, nothing else.
import type { Prisma } from "@prisma/client";
import { prisma, withTransaction } from "../../db/client";

export interface StaffRecord {
  id: string;
  email: string;
  roles: string[];
  hasPin: boolean;
  createdAt: string;
}

// A role that arrives with no permissions would be a lock with no key, so a
// new role name gets a sensible default set. Existing roles keep whatever
// permissions they already carry. This is what lets the staff form create a
// "cashier" that can actually ring up a sale.
const PERMISSION_SETS: Record<string, string[]> = {
  owner: ["sale.create", "sale.refund", "inventory.adjust", "reports.view", "settings.manage"],
  admin: ["sale.create", "sale.refund", "inventory.adjust", "reports.view", "settings.manage"],
  manager: ["sale.create", "sale.refund", "inventory.adjust", "reports.view"],
  cashier: ["sale.create"],
};

export function defaultPermissions(roleName: string): string[] {
  return PERMISSION_SETS[roleName.trim().toLowerCase()] ?? ["sale.create"];
}

export interface CreateStaffRecord {
  email: string;
  passwordHash: string;
  pinHash?: string;
  roleNames: string[];
}

export interface UpdateStaffRecord {
  passwordHash?: string;
  pinHash?: string | null;
  roleNames?: string[];
}

export interface UsersRepositoryLike {
  list(tenantId: string): Promise<StaffRecord[]>;
  listRoleNames(tenantId: string): Promise<string[]>;
  findByEmail(tenantId: string, email: string): Promise<{ id: string } | null>;
  findById(tenantId: string, id: string): Promise<StaffRecord | null>;
  create(tenantId: string, input: CreateStaffRecord): Promise<StaffRecord>;
  update(tenantId: string, id: string, input: UpdateStaffRecord): Promise<StaffRecord>;
}

function toRecord(user: {
  id: string;
  email: string;
  pinHash: string | null;
  createdAt: Date;
  roles: { role: { name: string } }[];
}): StaffRecord {
  return {
    id: user.id,
    email: user.email,
    roles: user.roles.map((userRole) => userRole.role.name),
    // The hash never leaves the server — only whether a PIN exists.
    hasPin: user.pinHash !== null,
    createdAt: user.createdAt.toISOString(),
  };
}

const include = { roles: { include: { role: true } } } as const;

// Upsert every role name the caller asked for and return their ids, so a
// brand-new role name never fails the whole staff creation.
async function resolveRoleIds(
  tx: Prisma.TransactionClient,
  tenantId: string,
  names: string[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const role = await tx.role.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: {},
      create: { tenantId, name, permissions: defaultPermissions(name) },
    });
    ids.push(role.id);
  }
  return ids;
}

export class UsersRepository implements UsersRepositoryLike {
  async list(tenantId: string): Promise<StaffRecord[]> {
    const rows = await prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      include,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toRecord);
  }

  async listRoleNames(tenantId: string): Promise<string[]> {
    const rows = await prisma.role.findMany({
      where: { tenantId, deletedAt: null },
      select: { name: true },
      orderBy: { name: "asc" },
    });
    return rows.map((row) => row.name);
  }

  async findByEmail(tenantId: string, email: string): Promise<{ id: string } | null> {
    return prisma.user.findFirst({
      where: { tenantId, email, deletedAt: null },
      select: { id: true },
    });
  }

  async findById(tenantId: string, id: string): Promise<StaffRecord | null> {
    const row = await prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      include,
    });
    return row ? toRecord(row) : null;
  }

  // The user and its role links go in as one nested write, which is atomic on
  // its own — no interactive transaction needed, and one fewer round trip to
  // a pooled database. A user with no role would be a login that can do
  // nothing, which is never what the caller meant.
  async create(tenantId: string, input: CreateStaffRecord): Promise<StaffRecord> {
    const roleIds = await resolveRoleIds(prisma, tenantId, input.roleNames);
    const user = await prisma.user.create({
      data: {
        tenantId,
        email: input.email,
        passwordHash: input.passwordHash,
        pinHash: input.pinHash ?? null,
        roles: { create: roleIds.map((roleId) => ({ roleId })) },
      },
      include,
    });
    return toRecord(user);
  }

  async update(tenantId: string, id: string, input: UpdateStaffRecord): Promise<StaffRecord> {
    // Replacing a role set has to be all-or-nothing: a half-applied edit
    // leaves someone with no roles and no way in.
    return withTransaction(async (tx) => {
      if (input.roleNames) {
        const roleIds = await resolveRoleIds(tx, tenantId, input.roleNames);
        // Replace the set: the form sends the full desired role list.
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
      }

      const user = await tx.user.update({
        where: { id },
        data: {
          ...(input.passwordHash !== undefined ? { passwordHash: input.passwordHash } : {}),
          ...(input.pinHash !== undefined ? { pinHash: input.pinHash } : {}),
        },
        include,
      });
      return toRecord(user);
    });
  }
}
