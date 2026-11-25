/**
 * Route guard for the admin app.
 *
 * `proxy.ts` is what Next 16 renamed `middleware.ts` to; the function must be
 * named `proxy` (or be the default export), and it runs on the Node.js runtime,
 * which is why `lib/session.ts` can use `node:crypto` directly.
 *
 * This is the *optimistic* check Next's auth guide describes: it only reads the
 * signed cookie, never the database, because it runs on every matched request
 * including prefetches. It keeps an unauthenticated browser from opening an
 * admin page. It is NOT the security boundary for the data — Server Actions are
 * reachable by direct POST without ever passing a navigation through here, so
 * each one calls `requireAbility()` itself. See `lib/auth.ts`.
 *
 * The role in the cookie is only the role at sign-in, so the staff → admin
 * bounce below is a convenience. The section layout, each page and each action
 * check the current role from the database.
 */

import { NextResponse, type NextRequest } from "next/server";

import { homePathFor } from "@/lib/permissions";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // The app moved from /user to /office/admin. Old bookmarks keep working;
  // temporary, so the target can still change. A staff cookie is then sent on
  // to the staff section by the check below, on the next request.
  if (pathname === "/user" || pathname.startsWith("/user/")) {
    return NextResponse.redirect(
      new URL(`/office/admin${pathname.slice("/user".length)}${search}`, request.nextUrl),
    );
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = readSessionToken(token);

  if (!session && pathname.startsWith("/office")) {
    const login = new URL("/login", request.nextUrl);
    // Carry the destination so a bookmarked order lands on that order after
    // signing in, rather than dumping everyone on their home page. Read back
    // through safeNextPath(), which is what stops it being an open redirect.
    login.searchParams.set("next", `${pathname}${search}`);

    const response = NextResponse.redirect(login);
    // An expired or tampered cookie is dead weight that would be re-sent on
    // every subsequent request; drop it on the way out.
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (
    session?.role === "staff" &&
    (pathname === "/office/admin" || pathname.startsWith("/office/admin/"))
  ) {
    return NextResponse.redirect(new URL(homePathFor("staff"), request.nextUrl));
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL(homePathFor(session.role), request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Section roots are listed alongside `/:path*` rather than relying on `*` to
  // match zero segments, which is ambiguous at a root. `/user` only redirects.
  matcher: ["/office", "/office/:path*", "/user", "/user/:path*", "/login"],
};
