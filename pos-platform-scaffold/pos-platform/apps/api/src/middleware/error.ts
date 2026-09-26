// Single error envelope for the whole API.
import type { FastifyInstance } from "fastify";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    reply.status(err.statusCode ?? 500).send({
      error: {
        message: err.message ?? "Internal error",
        code: err.code ?? "INTERNAL_ERROR",
      },
    });
  });
}
