// Request validation against the @pos/contracts schemas. A handler downstream
// can then read request.body as the parsed, typed value instead of casting a
// raw payload — the contract and the runtime check are the same object.
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ZodType } from "zod";

export function validateBody<T>(schema: ZodType<T>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      await reply.status(400).send({
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: result.error.flatten(),
        },
      });
      return;
    }
    request.body = result.data;
  };
}
