// zod-validated process.env. Fails fast on boot rather than at the first
// request that happens to touch the missing variable.
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  AI_SERVICE_TOKEN: z.string().min(1),
  MPESA_CALLBACK_URL: z.string().url().optional(),
});

export const env = schema.parse(process.env);
