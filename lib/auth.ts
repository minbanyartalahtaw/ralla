/**
 * The session cookie, and the guards every admin page and Server Action runs.
 *
 * Split from `lib/session.ts` because that module is imported by `proxy.ts`,
 * which runs before a route is rendered and has no `next/headers` context.
 */

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  createSessionToken,
  passwordVersion,
  readSessionToken,
} from "@/lib/session";
import { getStaff, type Staff } from "@/lib/staff-store";

/** Where to land when there's nothing better to go back to. */
export const AFTER_LOGIN = "/user/dashboard";

/**
 * Writes the session cookie. Server Actions and Route Handlers only — nothing
 * else is allowed to set a cookie.
 */
export async function createSession(staff: Staff): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(staff), {
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

/**
 * The signed-in person, read fresh from the database — or null.
 *
 * Null when there's no valid cookie, the person no longer exists, was
 * deactivated, or has changed their password since the cookie was issued.
 * Their *current* role comes from the row, not the cookie, so demoting an admin
 * takes effect on their next click.
 *
 * `cache()` makes the layout and the page it wraps share one query per request.
 */
export const getCurrentStaff = cache(async (): Promise<Staff | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = readSessionToken(token);
  if (!session) return null;

  const staff = await getStaff(session.sid);
  if (!staff || !staff.active) return null;
  if (passwordVersion(staff.passwordHash) !== session.pv) return null;
  return staff;
});

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
 *
 * A cookie that verifies but whose person is gone is cleared on the way out;
 * otherwise `proxy.ts` (which only reads the cookie) would bounce them straight
 * back off /login.
 */
export async function requireSession(): Promise<Staff> {
  const staff = await getCurrentStaff();
  if (!staff) {
    await clearSession();
    redirect("/login");
  }
  return staff;
}

/** `requireSession()` for actions only an admin may run. */
export async function requireAdmin(): Promise<Staff> {
  const staff = await requireSession();
  if (staff.role !== "admin") redirect(AFTER_LOGIN);
  return staff;
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
