/**
 * Creates the first admin. Run with:
 *
 *   npm run admin:create
 *
 * This is the bootstrap, and nothing more: it refuses to run once any admin
 * exists, so it can't be used to mint a second one or to reset a password.
 * Every other account is created from the app's UI.
 *
 * It asks for a name, a username, then a password with the typing hidden. The password
 * is never taken as an argument, which would land it in shell history. For a
 * non-interactive run, set ADMIN_NAME_INIT, ADMIN_USERNAME_INIT and ADMIN_PASSWORD_INIT.
 *
 * Targets whatever DATABASE_URL points at. Check .env before running it.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";
import { MIN_PASSWORD_LENGTH, hashPassword } from "../lib/password";

function prompt(label: string, hidden: boolean): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(label);
    const stdin = process.stdin;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") process.exit(130); // Ctrl+C
        if (ch === "\u007f") {
          if (value && !hidden) process.stdout.write("\b \b");
          value = value.slice(0, -1);
        } else {
          value += ch;
          if (!hidden) process.stdout.write(ch);
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const name = (
    process.env.ADMIN_NAME_INIT ?? (await prompt("Name: ", false))
  ).trim();
  if (!name) {
    console.error("Name can't be empty.");
    process.exit(1);
  }

  const username = (
    process.env.ADMIN_USERNAME_INIT ?? (await prompt("Username: ", false))
  )
    .trim()
    .toLowerCase();
  if (!username) {
    console.error("Username can't be empty.");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    // Checked before asking for a password, so a refused run doesn't make
    // anyone type one for nothing.
    if ((await prisma.staff.count({ where: { role: "admin" } })) > 0) {
      console.error("An admin already exists — this script only creates the first one.");
      process.exit(1);
    }

    const password =
      process.env.ADMIN_PASSWORD_INIT ?? (await prompt("Password: ", true));
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      process.exit(1);
    }

    const passwordHash = await hashPassword(password);

    // Re-check and insert in one transaction, so two runs started together
    // can't both pass the check above and leave two admins.
    await prisma.$transaction(
      async (tx) => {
        if ((await tx.staff.count({ where: { role: "admin" } })) > 0) {
          throw new Error("An admin already exists — this script only creates the first one.");
        }
        await tx.staff.create({ data: { name, username, passwordHash, role: "admin" } });
      },
      { isolationLevel: "Serializable" },
    );
    console.log(`Created admin ${name} (${username}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
