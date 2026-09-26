// pino logger instance, shared across the app
// TODO: implement. Scaffold only — see docs/01-architecture.md for the contract.
import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});
