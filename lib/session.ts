/**
 * Session token: sign and verify.
 *
 * Deliberately free of `next/headers` and of anything that touches the
 * database, because `proxy.ts` imports this module and runs before a route is
 * rendered. Cookie reading and writing lives in `lib/auth.ts` instead.
 *
 * The token says *who* (a staff id), their role at sign-in, and when it
 * expires. It is proof the cookie was issued by us, not proof the person still
 * has access: `requireSession()` / `getCurrentStaff()` in `lib/auth.ts` check
 * the row on every request, so a deactivated person or a changed password
 * stops working immediately rather than at expiry.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ralla_session";

/** A week. Staff open this daily; signing in again every Monday is tolerable. */
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type StaffRoleName = "staff" | "admin";

export type SessionPayload = {
  /** Staff.id */
  sid: number;
  role: StaffRoleName;
  /**
   * A fingerprint of the password hash the cookie was issued under. Changing a
   * password changes it, which is what signs that person's old cookies out.
   */
  pv: string;
  /** Expiry, ms since epoch. */
  exp: number;
};

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    // Throwing beats defaulting: a blank secret would sign tokens anyone could
    // forge.
    throw new Error("SESSION_SECRET is not set. Copy .env.example to .env.");
  }
  return value;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Short, non-reversible stand-in for a password hash, safe to put in a cookie. */
export function passwordVersion(passwordHash: string): string {
  return createHmac("sha256", secret())
    .update(`pv:${passwordHash}`)
    .digest("base64url")
    .slice(0, 16);
}

/**
 * `<base64url payload>.<base64url signature>`.
 *
 * The expiry is inside the signed payload rather than left to the cookie's
 * Max-Age, which is a hint to the browser and not a rule the server can lean
 * on — a cookie replayed by anything other than a browser never expires.
 */
export function createSessionToken(
  staff: { id: number; role: StaffRoleName; passwordHash: string },
  now = Date.now(),
): string {
  const payload: SessionPayload = {
    sid: staff.id,
    role: staff.role,
    pv: passwordVersion(staff.passwordHash),
    exp: now + SESSION_MAX_AGE_MS,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** The payload when the token is well-formed, correctly signed and unexpired. */
export function readSessionToken(
  token: string | undefined,
  now = Date.now(),
): SessionPayload | null {
  if (!token) return null;

  const dot = token.indexOf(".");
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const signature = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = Buffer.from(sign(body), "base64url");

  // timingSafeEqual throws rather than returns on a length mismatch, so the
  // lengths have to be compared first — that much is safe to leak, since the
  // digest length is fixed and public.
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    const valid =
      Number.isInteger(p.sid) &&
      (p.role === "staff" || p.role === "admin") &&
      typeof p.pv === "string" &&
      typeof p.exp === "number" &&
      p.exp > now;
    return valid ? (p as SessionPayload) : null;
  } catch {
    return null;
  }
}
