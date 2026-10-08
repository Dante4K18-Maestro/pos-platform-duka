// zod-validated process.env. Fails fast on boot rather than at the first
// request that happens to touch the missing variable.
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

// Local dev keeps a single .env at the repo root (see README/bootstrap.sh);
// nothing else loads it for the API, which is why `pnpm dev` used to boot
// straight into a ZodError. Node's built-in loader avoids a dotenv dependency.
// Deployments supply real env vars and have no .env, and tests set theirs in
// setup-env.ts, so both are unaffected.
if (process.env.NODE_ENV !== "test") {
  const candidate = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
  ].find(existsSync);

  if (candidate) process.loadEnvFile(candidate);
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  AI_SERVICE_TOKEN: z.string().min(1),
  // Daraja credentials are optional: without them the API still boots and
  // M-Pesa sales simply stay PENDING, and /settings/mpesa reports
  // `configured: false` instead of pretending a push would go out.
  MPESA_CALLBACK_URL: optionalValue(z.string().url()),
  MPESA_CONSUMER_KEY: optionalValue(z.string().min(1)),
  MPESA_CONSUMER_SECRET: optionalValue(z.string().min(1)),
  MPESA_PASSKEY: optionalValue(z.string().min(1)),
  MPESA_SHORTCODE: optionalValue(z.string().min(1)),
  // "sandbox" | "production" — selects the Daraja base URL.
  MPESA_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),

  // The published, stable origin this deployment is reachable at (Render,
  // a tunnel, anything public). Daraja needs it for the callback, and the
  // scheduler uses it to keep the free-tier instance from spinning down.
  PUBLIC_BASE_URL: optionalValue(z.string().url()),

  // In-process scheduler: the every-minute M-Pesa recheck and the
  // trading-hours keep-awake ping. On by default; a single-purpose worker
  // (or a test suite) can switch it off.
  SCHEDULER_ENABLED: booleanValue(true),
  TRADING_HOURS_START: z.coerce.number().int().min(0).max(23).default(6),
  TRADING_HOURS_END: z.coerce.number().int().min(1).max(24).default(22),
  TRADING_TIMEZONE: z.string().default("Africa/Nairobi"),
});

// "true"/"false" (and 1/0) from the environment, defaulting when unset. A
// plain z.coerce.boolean would read the string "false" as true.
function booleanValue(defaultValue: boolean) {
  return z
    .preprocess((value) => {
      if (value === undefined || value === "") return undefined;
      if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
      return value;
    }, z.boolean().default(defaultValue));
}

// The .env files ship these keys blank (a placeholder a deployer fills in),
// and an empty string is not "unset" to zod. Treat blank and whitespace-only
// as absent so an unconfigured Daraja does not fail the boot.
function optionalValue<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    schema.optional(),
  );
}

export const env = schema.parse(process.env);
