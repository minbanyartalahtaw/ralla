"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { clearSession, createSession, safeNextPath } from "@/lib/auth";
import { DUMMY_HASH, verifyPassword } from "@/lib/password";
import { findStaffByUsername } from "@/lib/staff-store";
import type { LoginState } from "./state";

/**
 * Throttle, because a login form is the easiest thing in the world to guess
 * at in bulk.
 *
 * In-memory and per-instance, so it is a speed bump rather than a wall: it
 * resets on deploy, and a client that forges `x-forwarded-for` gets a fresh
 * bucket per made-up address. It still turns "thousands of guesses a minute"
 * into "eight every ten minutes" for an ordinary attacker, which is the
 * difference that matters. Move it to Postgres or Redis if this ever faces the
 * open internet.
 */
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

async function clientKey(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  // First entry is the originating client; the rest are proxies it passed
  // through. Absent when nothing sits in front of the app, as in local dev.
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function takeAttempt(key: string, now: number): boolean {
  const record = attempts.get(key);

  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  record.count += 1;
  return record.count <= MAX_ATTEMPTS;
}

export async function signInAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (username.trim() === "" || password === "") {
    // Doesn't spend an attempt — an empty submit is a slip, not a guess.
    return { error: "Enter your username and password." };
  }

  const key = await clientKey();
  if (!takeAttempt(key, Date.now())) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const staff = await findStaffByUsername(username);
  // Always one scrypt run, found or not, so the timing doesn't say whether the
  // username exists. A deactivated account fails the same way as a wrong
  // password — it shouldn't be possible to tell it is there.
  const passwordOk = await verifyPassword(
    password,
    staff?.passwordHash ?? (await DUMMY_HASH),
  );

  if (!staff || !staff.active || !passwordOk) {
    // One message for every miss on purpose. Saying which part was wrong would
    // let someone confirm a username on its own.
    return { error: "That username or password isn't right." };
  }

  // A successful sign-in clears the count, so a staff member who mistyped
  // twice this morning isn't still carrying it this afternoon.
  attempts.delete(key);
  await createSession(staff);

  // Outside any try/catch — redirect() signals by throwing, and swallowing it
  // would leave the browser sitting on the login form with a live session.
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
