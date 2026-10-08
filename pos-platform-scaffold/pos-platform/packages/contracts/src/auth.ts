import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type AuthTokens = z.infer<typeof authTokensSchema>;
