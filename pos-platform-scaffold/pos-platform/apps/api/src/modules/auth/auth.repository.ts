import { prisma } from "../../db/client";

export interface AuthUserRecord {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  roles: string[];
}

export interface AuthRepositoryLike {
  findByEmail(email: string): Promise<AuthUserRecord | null>;
}

export class AuthRepository implements AuthRepositoryLike {
  // Email identifies the user across tenants for the login screen; the tenant
  // is then read from the user row, never supplied by the client.
  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
    if (!user) return null;

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      passwordHash: user.passwordHash,
      roles: user.roles.map((userRole) => userRole.role.name),
    };
  }
}
