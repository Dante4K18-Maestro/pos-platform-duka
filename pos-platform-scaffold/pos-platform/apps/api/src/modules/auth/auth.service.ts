import type { LoginInput } from "@pos/contracts";
import { verifyPassword } from "../../utils/password";
import { AuthRepository, type AuthRepositoryLike } from "./auth.repository";

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  roles: string[];
}

export class AuthService {
  constructor(private readonly repo: AuthRepositoryLike = new AuthRepository()) {}

  // Returns the authenticated identity, or null for any failure. The caller
  // must not distinguish "unknown email" from "wrong password" — same 401,
  // same message.
  async verifyCredentials(input: LoginInput): Promise<AuthenticatedUser | null> {
    const email = input.email.trim().toLowerCase();
    const user = await this.repo.findByEmail(email);
    if (!user) return null;

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) return null;

    return { id: user.id, tenantId: user.tenantId, roles: user.roles };
  }
}
