import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/session";

/**
 * Landing spot for a session cookie that is validly signed but no longer
 * belongs to anyone who may sign in (account removed or deactivated, password
 * changed). A Server Component can't delete a cookie, so this does it and moves
 * on to the form. Clearing a cookie is harmless to trigger, so GET is fine.
 */
export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
