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
 * each one calls `requireSession()` itself. See `lib/auth.ts`.
 */

import { NextResponse, type NextRequest } from "next/server";

import { AFTER_LOGIN } from "@/lib/auth";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = verifySessionToken(token);

  if (!signedIn && pathname.startsWith("/user")) {
    const login = new URL("/login", request.nextUrl);
    // Carry the destination so a bookmarked order lands on that order after
    // signing in, rather than dumping everyone on the dashboard. Read back
    // through safeNextPath(), which is what stops it being an open redirect.
    login.searchParams.set("next", `${pathname}${search}`);

    const response = NextResponse.redirect(login);
    // An expired or tampered cookie is dead weight that would be re-sent on
    // every subsequent request; drop it on the way out.
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (signedIn && pathname === "/login") {
    return NextResponse.redirect(new URL(AFTER_LOGIN, request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // `/user` is listed alongside `/user/:path*` rather than relying on `*` to
  // match zero segments, which is ambiguous at the section root.
  matcher: ["/user", "/user/:path*", "/login"],
};
