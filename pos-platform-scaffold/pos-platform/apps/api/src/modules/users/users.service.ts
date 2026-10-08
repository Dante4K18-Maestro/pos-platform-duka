// Staff business rules live here, and only here.
import type { CreateStaffInput, StaffMember, UpdateStaffInput } from "@pos/contracts";
import { hashPassword } from "../../utils/password";
import { UsersRepository, type StaffRecord, type UsersRepositoryLike } from "./users.repository";

export class StaffConflictError extends Error {
  readonly statusCode = 409;
  readonly code = "STAFF_EMAIL_EXISTS";
  constructor(email: string) {
    super(`a user with email ${email} already exists`);
  }
}

export class StaffNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = "STAFF_NOT_FOUND";
  constructor() {
    super("staff member not found");
  }
}

export class UsersService {
  constructor(private readonly repo: UsersRepositoryLike = new UsersRepository()) {}

  async list(tenantId: string): Promise<{ staff: StaffMember[]; roles: string[] }> {
    const [staff, roles] = await Promise.all([
      this.repo.list(tenantId),
      this.repo.listRoleNames(tenantId),
    ]);
    return { staff, roles };
  }

  async create(tenantId: string, input: CreateStaffInput): Promise<StaffMember> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.repo.findByEmail(tenantId, email);
    if (existing) throw new StaffConflictError(email);

    return this.repo.create(tenantId, {
      email,
      passwordHash: await hashPassword(input.password),
      ...(input.pin ? { pinHash: await hashPassword(input.pin) } : {}),
      roleNames: input.roles,
    });
  }

  async update(tenantId: string, id: string, input: UpdateStaffInput): Promise<StaffMember> {
    const found = await this.repo.findById(tenantId, id);
    if (!found) throw new StaffNotFoundError();

    const patch: Parameters<UsersRepositoryLike["update"]>[2] = {};
    if (input.roles !== undefined) patch.roleNames = input.roles;
    if (input.password !== undefined) patch.passwordHash = await hashPassword(input.password);
    // null clears the PIN; a string sets a new one.
    if (input.pin !== undefined) {
      patch.pinHash = input.pin === null ? null : await hashPassword(input.pin);
    }

    return this.repo.update(tenantId, id, patch);
  }
}

export type { StaffRecord };
