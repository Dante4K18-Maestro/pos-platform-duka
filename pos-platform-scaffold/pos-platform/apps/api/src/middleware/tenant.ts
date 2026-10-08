// Resolves tenant_id from the authenticated session and scopes every query.
// tenant_id must never be trusted from the request body or prompt.
//
// Runs as a global preHandler on every request. When a bearer token is
// present it is verified here, exactly once, and the tenant id is taken from
// the signed payload. Unauthenticated routes (/health, /auth/login) simply
// proceed with no tenant attached; `authenticate` turns a missing tenant into
// a 401 on protected routes.
import type { FastifyRequest } from "fastify";
import type { AccessTokenPayload } from "./auth";

declare module "fastify" {
  interface FastifyRequest {
    // Set only from a verified token payload. Absent on public routes and on
    // requests that carried an invalid/expired token.
    tenantId?: string;
  }
}

export async function registerTenantResolver(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return;

  try {
    // @fastify/jwt widens jwtVerify()'s return to `object | string`; the
    // payload shape is fixed by our own signer, so narrow it here rather than
    // reading tenantId off an untyped object.
    const payload = (await request.jwtVerify()) as AccessTokenPayload;
    request.tenantId = payload.tenantId;
  } catch {
    // Invalid or expired token: leave tenant unset. Protected routes reject
    // it via `authenticate`; public routes stay reachable.
  }
}
