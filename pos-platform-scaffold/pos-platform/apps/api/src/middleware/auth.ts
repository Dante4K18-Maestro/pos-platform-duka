// JWT access + refresh registration (fastify/jwt plugin).
//
// Verification happens once per request in the tenant resolver (see
// tenant.ts), which is why `authenticate` only checks the outcome rather than
// re-verifying the token: one signature check per request, one source of the
// tenant id (the signed payload).
import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  roles: string[];
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    // Route-level guard: rejects a request that carries no verified tenant.
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function registerAuth(app: FastifyInstance) {
  await app.register(fastifyJwt, { secret: env.JWT_ACCESS_SECRET });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenantId) {
      await reply
        .status(401)
        .send({ error: { message: "unauthorized", code: "UNAUTHORIZED" } });
    }
  });
}

// Access/refresh issuance lives in the auth module once login lands; these
// are the two shapes every signer/verifier in the system agrees on.
export function signAccessToken(app: FastifyInstance, payload: AccessTokenPayload) {
  return app.jwt.sign(payload, { expiresIn: "15m" });
}

export function signRefreshToken(app: FastifyInstance, payload: AccessTokenPayload) {
  return app.jwt.sign(payload, { expiresIn: "30d", key: env.JWT_REFRESH_SECRET });
}
