/**
 * Human-facing order codes: `RL-260804TXI` — RL, the date as YYMMDD, then
 * three random letters.
 *
 * The date part is the **Yangon** date. Using UTC would stamp any order placed
 * before 06:30 local with the previous day, which is exactly the sort of thing
 * nobody notices until someone is reconciling a day's takings.
 *
 * The random part is not a uniqueness guarantee — see ORDER_CODES_PER_DAY. The
 * database has a unique index on `code` and the caller retries on collision.
 */

import { randomInt } from "node:crypto";

import { TIME_ZONE } from "@/lib/orders";

/** Letters only, matching the RL-260804TXI shape. */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * 26³ = 17,576 codes per day. By the birthday bound that's roughly a 1-in-4
 * chance of at least one collision within a day at 100 orders, so the retry in
 * createOrder() is load-bearing, not belt-and-braces. If daily volume ever
 * reaches the high hundreds, add a fourth character rather than more retries.
 */
export const ORDER_CODES_PER_DAY = ALPHABET.length ** 3;

/** YYMMDD in Asia/Yangon. */
export function orderCodeDatePart(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("year")}${get("month")}${get("day")}`;
}

function randomPart(): string {
  let out = "";
  for (let i = 0; i < 3; i += 1) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

export function generateOrderCode(date: Date = new Date()): string {
  return `RL-${orderCodeDatePart(date)}${randomPart()}`;
}

/** `RL-` + 6 digits + 3 uppercase letters. */
export const ORDER_CODE_PATTERN = /^RL-\d{6}[A-Z]{3}$/;
