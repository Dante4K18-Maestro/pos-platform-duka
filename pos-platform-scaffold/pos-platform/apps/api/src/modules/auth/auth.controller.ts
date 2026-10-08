import type { LoginInput } from "@pos/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { signAccessToken, signRefreshToken } from "../../middleware/auth";
import { AuthService } from "./auth.service";

export class AuthController {
  constructor(private readonly service = new AuthService()) {}

  async login(req: FastifyRequest, reply: FastifyReply) {
    const { email, password } = req.body as LoginInput;
    const user = await this.service.verifyCredentials({ email, password });

    if (!user) {
      return reply
        .status(401)
        .send({ error: { message: "invalid credentials", code: "INVALID_CREDENTIALS" } });
    }

    const payload = { sub: user.id, tenantId: user.tenantId, roles: user.roles };
    return reply.send({
      accessToken: signAccessToken(req.server, payload),
      refreshToken: signRefreshToken(req.server, payload),
      tenantId: user.tenantId,
      userId: user.id,
    });
  }
}
