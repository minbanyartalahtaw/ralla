/**
 * Password hashing with scrypt from `node:crypto` — memory-hard, and no extra
 * dependency. Stored as `scrypt$<salt>$<hash>`, both base64url.
 *
 * Server-only. The login action and `scripts/create-staff.ts` both use it.
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/** Shared by the admin bootstrap script and the change-password form. */
export const MIN_PASSWORD_LENGTH = 8;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "base64url");
  const actual = await derive(password, Buffer.from(salt, "base64url"));
  // Lengths are fixed by KEY_LENGTH, but timingSafeEqual throws on a mismatch,
  // and a corrupted row shouldn't turn into a 500.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * A real hash of a password nobody has, for the "no such username" path: the
 * login still pays for one scrypt run, so a missing username can't be told
 * apart from a wrong password by how long the answer takes.
 */
export const DUMMY_HASH = hashPassword(randomBytes(16).toString("hex"));
