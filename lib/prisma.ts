/**
 * Prisma client singleton.
 *
 * Prisma 7 requires an explicit driver adapter — there is no implicit engine
 * connection any more, so the pg adapter is wired up here.
 *
 * Next's dev HMR re-evaluates modules on every save. Constructing a client at
 * module scope would open a fresh connection pool each time and exhaust
 * Postgres' connection limit within a few edits, so the instance is cached on
 * globalThis in development.
 *
 * Server-only — never import this from a Client Component.
 */

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env, then run `npm run db:up`.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
