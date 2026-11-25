/**
 * Dev-only: creates a `staff` account in the LOCAL database for testing roles.
 *
 *   npm run staff:create
 *
 * Asks for a name, a username and a hidden password, or reads STAFF_NAME_INIT,
 * STAFF_USERNAME_INIT and STAFF_PASSWORD_INIT. Refuses to touch production.
 * Real staff accounts are made from the app's Staff page.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "../generated/prisma/client";
import { MIN_PASSWORD_LENGTH, hashPassword } from "../lib/password";
import { prompt } from "./prompt";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  if (connectionString.includes("prisma.io")) {
    console.error("DATABASE_URL points at production — this script is for the local database only.");
    process.exit(1);
  }

  const name = (process.env.STAFF_NAME_INIT ?? (await prompt("Name: ", false))).trim();
  if (!name) {
    console.error("Name can't be empty.");
    process.exit(1);
  }

  const username = (process.env.STAFF_USERNAME_INIT ?? (await prompt("Username: ", false)))
    .trim()
    .toLowerCase();
  if (!username) {
    console.error("Username can't be empty.");
    process.exit(1);
  }

  const password = process.env.STAFF_PASSWORD_INIT ?? (await prompt("Password: ", true));
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const passwordHash = await hashPassword(password);
    await prisma.staff.create({ data: { name, username, passwordHash, role: "staff" } });
    console.log(`Created staff ${name} (${username}).`);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      console.error(`The username "${username}" is already taken.`);
      process.exit(1);
    }
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
