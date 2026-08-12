/**
 * The session cookie, and the guard every admin Server Action runs first.
 *
 * Split from `lib/session.ts` because that module is imported by `proxy.ts`,
 * which runs before a route is rendered and has no `next/headers` context.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  createSessionToken,
  verifySessionToken,
} from "@/lib/session";

/** Where to land when there's nothing better to go back to. */
export const AFTER_LOGIN = "/user/dashboard";

/**
 * Writes the session cookie. Server Actions and Route Handlers only — nothing
 * else is allowed to set a cookie.
 */
export async function createSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    // Only over HTTPS in production. Dev is served over plain http on the LAN,
    // and a Secure cookie would be dropped there — locking you out of the
    // login form you just submitted.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Whether this request carries a valid session. Safe to call anywhere. */
export async function isSignedIn(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/**
 * Guards an admin Server Action. Call it before reading the form, and before
 * touching the database.
 *
 * `proxy.ts` keeps an unauthenticated browser off `/user/*`, but that only
 * guards *navigation*. A Server Action is an ordinary POST to a route the
 * proxy has already let through, so anyone holding an action id can invoke one
 * without ever loading the page it belongs to. This is the check that actually
 * refuses them.
 *
 * Redirecting rather than throwing means a session that expired while a form
 * was open sends the user to the login page instead of an error screen; an
 * attacker gets the same redirect and no data either way.
 */
export async function requireSession(): Promise<void> {
  if (!(await isSignedIn())) {
    redirect("/login");
  }
}

/**
 * Sanitizes a `?next=` value into somewhere it is safe to send a browser.
 *
 * Only paths inside `/user` are allowed. Anything else — an absolute URL, a
 * protocol-relative `//evil.example` (which starts with `/` and would sail
 * past a naive prefix test), a path in another section — falls back to the
 * dashboard, so a crafted login link can't bounce someone off-site with the
 * app's own domain in the address bar.
 */
export function safeNextPath(next: string | undefined): string {
  if (!next) return AFTER_LOGIN;
  return /^\/user(\/|\?|$)/.test(next) ? next : AFTER_LOGIN;
}
