// pino logger instance, shared across the app. Typed as FastifyBaseLogger so
// the app instance, error handler and auth/config helpers all agree on the
// logger generic instead of each inferring a different one.
import type { FastifyBaseLogger } from "fastify";
import pino from "pino";

export const logger: FastifyBaseLogger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});
