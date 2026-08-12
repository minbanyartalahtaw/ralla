/**
 * Session token: sign, verify, and check the shared admin credentials.
 *
 * Deliberately free of `next/headers` and of anything that touches the
 * database, because `proxy.ts` imports this module and runs before a route is
 * rendered. Cookie reading and writing lives in `lib/auth.ts` instead.
 *
 * RALLA is admin-only and everyone signs in with the same username and password
 * (see CLAUDE.md), so the token still carries no identity — only an expiry. The
 * username is a second thing to know, not a second *person*: it does not tell
 * you who is signed in. What the token proves is "whoever holds this knew both
 * credentials". If per-staff accounts arrive, the payload gains a staff id and
 * `OrderStatusEvent.changedBy` finally gets something to record.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ralla_session";

/** A week. Staff open this daily; signing in again every Monday is tolerable. */
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type EnvName = "SESSION_SECRET" | "ADMIN_USERNAME" | "ADMIN_PASSWORD";

function env(name: EnvName): string {
  const value = process.env[name];
  if (!value) {
    // Throwing beats defaulting: a blank secret would sign tokens anyone could
    // forge, and a blank credential would let an empty form submission in.
    throw new Error(`${name} is not set. Copy .env.example to .env.`);
  }
  return value;
}

/** Usernames are matched case- and whitespace-insensitively. */
function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * The configured username, for display in the UI.
 *
 * Trimmed but NOT lowercased — matching ignores case, so `Admin` and `admin`
 * both sign in, and the header should show whichever spelling was configured.
 * Server-side only: it reads the environment.
 */
export function adminUsername(): string {
  return env("ADMIN_USERNAME").trim();
}

/**
 * The signing key, mixed from the secret AND both credentials.
 *
 * Mixing the credentials in is what makes rotating them mean something: with a
 * single shared login, you change it precisely because someone should no longer
 * have access, and a key derived from the secret alone would leave their
 * existing cookie valid for the rest of the week.
 *
 * The pair goes through JSON so the two values can't run together — feeding
 * `update(user)` then `update(pass)` would give `("ab", "c")` and `("a", "bc")`
 * the same key.
 */
function signingKey(): Buffer {
  return createHmac("sha256", env("SESSION_SECRET"))
    .update(
      JSON.stringify([
        normalizeUsername(env("ADMIN_USERNAME")),
        env("ADMIN_PASSWORD"),
      ]),
    )
    .digest();
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

/**
 * `<base64url payload>.<base64url signature>`.
 *
 * The expiry is inside the signed payload rather than left to the cookie's
 * Max-Age, which is a hint to the browser and not a rule the server can lean
 * on — a cookie replayed by anything other than a browser never expires.
 */
export function createSessionToken(now = Date.now()): string {
  const payload = b64url(JSON.stringify({ exp: now + SESSION_MAX_AGE_MS }));
  return `${payload}.${sign(payload)}`;
}

/** True when the token is well-formed, correctly signed, and unexpired. */
export function verifySessionToken(
  token: string | undefined,
  now = Date.now(),
): boolean {
  if (!token) return false;

  const dot = token.indexOf(".");
  if (dot < 1) return false;

  const payload = token.slice(0, dot);
  const signature = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = Buffer.from(sign(payload), "base64url");

  // timingSafeEqual throws rather than returns on a length mismatch, so the
  // lengths have to be compared first — that much is safe to leak, since the
  // digest length is fixed and public.
  if (signature.length !== expected.length) return false;
  if (!timingSafeEqual(signature, expected)) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > now;
  } catch {
    return false;
  }
}

/**
 * Constant-time credential check.
 *
 * Compares digests instead of the raw strings so that two different lengths
 * still take the same time to reject — comparing the inputs directly would leak
 * each value's length through timing.
 *
 * Both halves are always compared, and combined with `&` rather than `&&`: a
 * short-circuit would return as soon as the username missed, and the difference
 * in timing would say which of the two was wrong. The caller reports one
 * message for both for the same reason.
 */
export function checkCredentials(username: string, password: string): boolean {
  const digest = (label: string, value: string) =>
    createHmac("sha256", `${label}-compare`).update(value).digest();

  const userOk = timingSafeEqual(
    digest("username", normalizeUsername(username)),
    digest("username", normalizeUsername(env("ADMIN_USERNAME"))),
  );
  const passOk = timingSafeEqual(
    digest("password", password),
    digest("password", env("ADMIN_PASSWORD")),
  );

  return Boolean(Number(userOk) & Number(passOk));
}
