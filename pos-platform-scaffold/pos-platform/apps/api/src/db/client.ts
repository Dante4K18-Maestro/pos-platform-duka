// Prisma singleton — one client per process, reused across requests.
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
