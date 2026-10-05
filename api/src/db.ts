import { PrismaClient } from "@prisma/client";

// Single shared client. SQLite file from DATABASE_URL is created by
// `npx prisma migrate dev`. The server refuses to boot without it.
export const prisma = new PrismaClient();
